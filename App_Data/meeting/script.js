class MeetingBase {
    constructor() {
        this.backendUrl = 'https://meeting-base-backend.onrender.com';
        this.socket = null;
        this.currentMeetingId = null;
        this.currentRoomId = null;
        this.participantId = null;
        this.token = null;
        this.localParticipant = null;
        this.isAudioEnabled = true;
        this.isVideoEnabled = true;
        this.isScreenSharing = false;
        this.localStream = null;
        this.participants = new Map();
        this.peerConnections = new Map();
        this.remoteStreams = new Map();
        this.iceCandidatesQueue = new Map();
        this.rtcConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        setTimeout(() => this.initializeApp(), 100);
    }

    async initializeApp() {
        this.loadUserData();
        this.bindEvents();
        this.showScreen('landing-screen');
        await this.initializeSocket();
    }

    async initializeSocket() {
        try {
            if (typeof io === 'undefined') {
                this.showError('Connection error. Please refresh the page.');
                return;
            }

            this.socket = io(this.backendUrl, {
                timeout: 10000,
                transports: ['websocket', 'polling']
            });
            
            this.setupSocketListeners();
        } catch (error) {
            this.showError('Failed to connect to server. Please try again.');
        }
    }

    setupSocketListeners() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to backend server');
        });

        this.socket.on('participant-joined', (data) => {
            this.handleParticipantJoined(data);
        });

        this.socket.on('participant-left', (data) => {
            this.handleParticipantLeft(data.participantId);
        });

        this.socket.on('meeting-joined', (data) => {
            this.handleMeetingJoined(data);
        });

        this.socket.on('webrtc-offer', (data) => {
            this.handleWebRTCOffer(data);
        });

        this.socket.on('webrtc-answer', (data) => {
            this.handleWebRTCAnswer(data);
        });

        this.socket.on('webrtc-ice-candidate', (data) => {
            this.handleICECandidate(data);
        });

        this.socket.on('participant-audio-toggle', (data) => {
            this.updateParticipantAudio(data.participantId, data.isEnabled);
        });

        this.socket.on('participant-video-toggle', (data) => {
            this.updateParticipantVideo(data.participantId, data.isEnabled);
        });
    }

    async handleParticipantJoined(data) {
        if (data.participantId !== this.participantId) {
            this.addRemoteParticipant(data);
            await this.createPeerConnection(data.participantId, true);
        }
    }

    handleParticipantLeft(participantId) {
        this.removeRemoteParticipant(participantId);
        this.closePeerConnection(participantId);
    }

    async handleMeetingJoined(data) {
        if (data.participants && data.participants.length > 0) {
            for (const participant of data.participants) {
                if (participant.id !== this.participantId) {
                    this.addRemoteParticipant(participant);
                    await this.createPeerConnection(participant.id, false);
                }
            }
        }
    }

    async createPeerConnection(participantId, isInitiator = false) {
        try {
            const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
            this.peerConnections.set(participantId, peerConnection);

            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
            }

            peerConnection.ontrack = (event) => {
                const [remoteStream] = event.streams;
                this.remoteStreams.set(participantId, remoteStream);
                this.displayRemoteStream(participantId, remoteStream);
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('webrtc-ice-candidate', {
                        to: participantId,
                        from: this.participantId,
                        candidate: event.candidate,
                        meetingId: this.currentMeetingId
                    });
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log(`Peer connection state with ${participantId}:`, peerConnection.connectionState);
            };

            if (isInitiator) {
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                this.socket.emit('webrtc-offer', {
                    to: participantId,
                    from: this.participantId,
                    offer: offer,
                    meetingId: this.currentMeetingId
                });
            }

            const queuedCandidates = this.iceCandidatesQueue.get(participantId) || [];
            for (const candidate of queuedCandidates) {
                await peerConnection.addIceCandidate(candidate);
            }
            this.iceCandidatesQueue.delete(participantId);

        } catch (error) {
            console.error('Error creating peer connection:', error);
        }
    }

    async handleWebRTCOffer(data) {
        try {
            const { from, offer } = data;
            let peerConnection = this.peerConnections.get(from);
            
            if (!peerConnection) {
                await this.createPeerConnection(from, false);
                peerConnection = this.peerConnections.get(from);
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            this.socket.emit('webrtc-answer', {
                to: from,
                from: this.participantId,
                answer: answer,
                meetingId: this.currentMeetingId
            });
        } catch (error) {
            console.error('Error handling WebRTC offer:', error);
        }
    }

    async handleWebRTCAnswer(data) {
        try {
            const { from, answer } = data;
            const peerConnection = this.peerConnections.get(from);
            
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        } catch (error) {
            console.error('Error handling WebRTC answer:', error);
        }
    }

    async handleICECandidate(data) {
        try {
            const { from, candidate } = data;
            const peerConnection = this.peerConnections.get(from);
            
            if (peerConnection && peerConnection.remoteDescription) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                const queue = this.iceCandidatesQueue.get(from) || [];
                queue.push(new RTCIceCandidate(candidate));
                this.iceCandidatesQueue.set(from, queue);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    displayRemoteStream(participantId, stream) {
        const videoElement = document.getElementById(`video-${participantId}`);
        if (videoElement) {
            videoElement.srcObject = stream;
            videoElement.style.display = 'block';
            videoElement.play();
            
            const placeholder = videoElement.nextElementSibling;
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    }

    closePeerConnection(participantId) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(participantId);
        }
        this.remoteStreams.delete(participantId);
        this.iceCandidatesQueue.delete(participantId);
    }

    loadUserData() {
        const savedName = localStorage.getItem('meetingbase_username');
        if (savedName) {
            const nameInput = document.getElementById('userName');
            if (nameInput) {
                nameInput.value = savedName;
            }
        }
    }

    saveUserData() {
        const nameInput = document.getElementById('userName');
        if (nameInput && nameInput.value.trim()) {
            const userName = nameInput.value.trim();
            localStorage.setItem('meetingbase_username', userName);
        }
    }

    bindEvents() {
        const createBtn = document.getElementById('createMeetingBtn');
        const joinBtn = document.getElementById('joinMeetingBtn');
        const userNameInput = document.getElementById('userName');

        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCreateMeeting();
            });
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showJoinScreen();
            });
        }

        if (userNameInput) {
            userNameInput.addEventListener('blur', () => this.saveUserData());
            userNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateMeeting();
                }
            });
        }

        const joinMeetingBtn = document.getElementById('joinBtn');
        const backBtn = document.getElementById('backToLanding');
        const meetingIdInput = document.getElementById('meetingId');

        if (joinMeetingBtn) {
            joinMeetingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleJoinMeeting();
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showScreen('landing-screen');
            });
        }

        if (meetingIdInput) {
            meetingIdInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            });
            meetingIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.target.value.length === 6) {
                    this.handleJoinMeeting();
                }
            });
        }

        this.bindMeetingControlEvents();
    }

    bindMeetingControlEvents() {
        const micBtn = document.getElementById('micBtn');
        const cameraBtn = document.getElementById('cameraBtn');
        const screenBtn = document.getElementById('screenBtn');
        const participantsBtn = document.getElementById('participantsBtn');
        const leaveBtn = document.getElementById('leaveBtn');

        if (micBtn) {
            micBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMic();
            });
        }

        if (cameraBtn) {
            cameraBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleCamera();
            });
        }

        if (screenBtn) {
            screenBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleScreenShare();
            });
        }

        if (participantsBtn) {
            participantsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showParticipantsList();
            });
        }

        if (leaveBtn) {
            leaveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.leaveMeeting();
            });
        }
    }

    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    showError(message, containerId = 'error-message') {
        const errorContainer = document.getElementById(containerId);
        if (errorContainer) {
            errorContainer.textContent = message;
            errorContainer.classList.add('show');
            setTimeout(() => {
                errorContainer.classList.remove('show');
            }, 5000);
        }
    }

    hideError(containerId = 'error-message') {
        const errorContainer = document.getElementById(containerId);
        if (errorContainer) {
            errorContainer.classList.remove('show');
        }
    }

    validateUserName() {
        const userNameInput = document.getElementById('userName');
        if (!userNameInput) {
            return false;
        }

        const userName = userNameInput.value.trim();
        if (!userName) {
            this.showError('Please enter your name first');
            userNameInput.focus();
            return false;
        }
        return true;
    }

    async handleCreateMeeting() {
        if (!this.validateUserName()) return;

        this.hideError();
        this.showScreen('loading-screen');
        this.updateLoadingText('Creating meeting...');

        try {
            const userName = document.getElementById('userName').value.trim();
            
            const response = await fetch(`${this.backendUrl}/api/create-meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userName }),
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentMeetingId = data.meetingId;
                this.currentRoomId = data.roomId;
                this.participantId = data.participantId;
                this.token = data.token;
                
                this.updateLoadingText('Setting up media...');
                await this.setupMediaStreams();
                
                this.updateLoadingText('Connecting to meeting...');
                await this.initializeMeeting();

                setTimeout(() => {
                    this.showMeetingScreen();
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to create meeting');
            }
        } catch (error) {
            let errorMessage = 'Failed to create meeting. ';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. Please try again.';
            } else {
                errorMessage += error.message || 'Please try again.';
            }
            
            this.showError(errorMessage);
            this.showScreen('landing-screen');
        }
    }

    showJoinScreen() {
        if (!this.validateUserName()) return;
        this.hideError('join-error-message');
        this.showScreen('join-screen');
    }

    async handleJoinMeeting() {
        const meetingIdInput = document.getElementById('meetingId');
        if (!meetingIdInput) {
            return;
        }

        const meetingId = meetingIdInput.value.trim();
        
        if (!this.validateUserName()) return;

        if (!meetingId || meetingId.length !== 6) {
            this.showError('Please enter a valid 6-digit meeting ID', 'join-error-message');
            meetingIdInput.focus();
            return;
        }

        this.hideError('join-error-message');
        this.showScreen('loading-screen');
        this.updateLoadingText('Validating meeting ID...');

        try {
            const userName = document.getElementById('userName').value.trim();
            
            const response = await fetch(`${this.backendUrl}/api/join-meeting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ meetingId, userName }),
                timeout: 10000
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentMeetingId = data.meetingId;
                this.currentRoomId = data.roomId;
                this.participantId = data.participantId;
                this.token = data.token;

                this.updateLoadingText('Setting up media...');
                await this.setupMediaStreams();

                this.updateLoadingText('Joining meeting...');
                await this.initializeMeeting();

                setTimeout(() => {
                    this.showMeetingScreen();
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to join meeting');
            }
        } catch (error) {
            let errorMessage = 'Failed to join meeting. ';
            
            if (error.message.includes('Meeting not found')) {
                errorMessage = 'Meeting not found. Please check the meeting ID and try again.';
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage += 'Please check your internet connection.';
            } else if (error.message.includes('timeout')) {
                errorMessage += 'Request timed out. Please try again.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.showError(errorMessage, 'join-error-message');
            this.showScreen('join-screen');
        }
    }

    async initializeMeeting() {
        const userName = document.getElementById('userName').value.trim();
        
        this.localParticipant = {
            id: this.participantId,
            displayName: userName,
            isLocal: true
        };
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-meeting-room', {
                meetingId: this.currentMeetingId,
                participantId: this.participantId,
                userName: userName
            });
        }
    }

    addRemoteParticipant(participantData) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        const existingParticipant = document.getElementById(`participant-${participantData.id}`);
        if (existingParticipant) return;

        const participantElement = document.createElement('div');
        participantElement.className = 'video-placeholder';
        participantElement.id = `participant-${participantData.id}`;
        participantElement.innerHTML = `
            <video id="video-${participantData.id}" autoplay playsinline style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
            <div class="placeholder-avatar" style="background: linear-gradient(45deg, #1a1a1a, #333); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; width: 100%; height: 100%;">
                ${(participantData.name || participantData.userName || 'User').charAt(0).toUpperCase()}
            </div>
            <div class="participant-overlay">
                <span class="participant-name">${participantData.name || participantData.userName || 'Unknown User'}</span>
                <div class="participant-controls">
                    <span class="mic-indicator" id="mic-${participantData.id}">🎤</span>
                </div>
            </div>
        `;
        
        videoGrid.appendChild(participantElement);
        this.participants.set(participantData.id, participantData);
        this.updateParticipantCount();
    }

    removeRemoteParticipant(participantId) {
        const participantElement = document.getElementById(`participant-${participantId}`);
        if (participantElement) {
            participantElement.remove();
        }
        this.participants.delete(participantId);
        this.closePeerConnection(participantId);
        this.updateParticipantCount();
    }

    updateParticipantAudio(participantId, isEnabled) {
        const micIndicator = document.getElementById(`mic-${participantId}`);
        if (micIndicator) {
            micIndicator.textContent = isEnabled ? '🎤' : '🔇';
        }
        
        const stream = this.remoteStreams.get(participantId);
        if (stream) {
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = isEnabled;
            });
        }
    }

    updateParticipantVideo(participantId, isEnabled) {
        const videoElement = document.getElementById(`video-${participantId}`);
        const placeholder = document.querySelector(`#participant-${participantId} .placeholder-avatar`);
        
        if (videoElement && placeholder) {
            if (isEnabled) {
                videoElement.style.display = 'block';
                placeholder.style.display = 'none';
            } else {
                videoElement.style.display = 'none';
                placeholder.style.display = 'flex';
            }
        }
    }

    async setupMediaStreams() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('Local media stream acquired');
        } catch (error) {
            console.error('Error accessing media devices:', error);
            this.showError('Failed to access camera/microphone. Please check permissions.');
            this.localStream = null;
        }
    }

    updateLoadingText(text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    showMeetingScreen() {
        this.showScreen('meeting-screen');
        this.updateMeetingInfo();
        this.updateParticipantCount();
        this.updateControlStates();
        this.setupLocalVideo();

        const userName = document.getElementById('userName').value.trim();
        const localName = document.getElementById('localName');
        if (localName) {
            localName.textContent = `${userName} (You)`;
        }
    }

    setupLocalVideo() {
        const localVideo = document.getElementById('localVideo');
        if (localVideo && this.localStream) {
            localVideo.srcObject = this.localStream;
        } else if (localVideo) {
            localVideo.style.backgroundColor = '#1a1a1a';
        }
    }

    updateMeetingInfo() {
        const meetingIdDisplay = document.getElementById('currentMeetingId');
        if (meetingIdDisplay) {
            meetingIdDisplay.textContent = this.currentMeetingId || 'Unknown';
        }
    }

    updateParticipantCount() {
        const participantCountEl = document.getElementById('participantCount');
        if (participantCountEl) {
            let count = 1 + this.participants.size;
            participantCountEl.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        }
    }

    updateControlStates() {
        const micBtn = document.getElementById('micBtn');
        const cameraBtn = document.getElementById('cameraBtn');
        const micIndicator = document.getElementById('localMicIndicator');

        if (micBtn) {
            micBtn.classList.toggle('active', this.isAudioEnabled);
        }
        if (cameraBtn) {
            cameraBtn.classList.toggle('active', this.isVideoEnabled);
        }
        if (micIndicator) {
            micIndicator.textContent = this.isAudioEnabled ? '🎤' : '🔇';
        }
    }

    toggleMic() {
        this.isAudioEnabled = !this.isAudioEnabled;
        
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = this.isAudioEnabled;
            });
        }
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('toggle-audio', {
                isEnabled: this.isAudioEnabled,
                participantId: this.participantId,
                meetingId: this.currentMeetingId
            });
        }
        
        this.updateControlStates();
    }

    toggleCamera() {
        this.isVideoEnabled = !this.isVideoEnabled;
        
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = this.isVideoEnabled;
            });
        }
        
        if (this.socket && this.socket.connected) {
            this.socket.emit('toggle-video', {
                isEnabled: this.isVideoEnabled,
                participantId: this.participantId,
                meetingId: this.currentMeetingId
            });
        }
        
        this.updateControlStates();
    }

    async toggleScreenShare() {
        const screenBtn = document.getElementById('screenBtn');
        
        try {
            if (this.isScreenSharing) {
                this.isScreenSharing = false;
                if (screenBtn) screenBtn.classList.remove('active');
                await this.setupMediaStreams();
                this.setupLocalVideo();
                this.updateAllPeerConnections();
            } else {
                if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                    const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
                        video: true,
                        audio: true
                    });
                    
                    const localVideo = document.getElementById('localVideo');
                    if (localVideo) {
                        localVideo.srcObject = screenStream;
                    }
                    
                    this.isScreenSharing = true;
                    if (screenBtn) screenBtn.classList.add('active');
                    
                    screenStream.getVideoTracks()[0].onended = () => {
                        this.isScreenSharing = false;
                        if (screenBtn) screenBtn.classList.remove('active');
                        this.setupMediaStreams().then(() => {
                            this.setupLocalVideo();
                            this.updateAllPeerConnections();
                        });
                    };
                    
                    this.localStream = screenStream;
                    this.updateAllPeerConnections();
                } else {
                    this.showError('Screen sharing is not supported in this browser.');
                }
            }
        } catch (error) {
            console.error('Screen share error:', error);
            this.showError('Failed to toggle screen sharing');
        }
    }

    updateAllPeerConnections() {
        if (this.localStream) {
            this.peerConnections.forEach(async (peerConnection, participantId) => {
                const senders = peerConnection.getSenders();
                const videoSender = senders.find(sender => 
                    sender.track && sender.track.kind === 'video'
                );
                const audioSender = senders.find(sender => 
                    sender.track && sender.track.kind === 'audio'
                );

                const videoTrack = this.localStream.getVideoTracks()[0];
                const audioTrack = this.localStream.getAudioTracks()[0];

                if (videoSender && videoTrack) {
                    await videoSender.replaceTrack(videoTrack);
                }
                if (audioSender && audioTrack) {
                    await audioSender.replaceTrack(audioTrack);
                }
            });
        }
    }

    showParticipantsList() {
        let participants = [document.getElementById('userName').value.trim() + ' (You)'];
        
        this.participants.forEach(participant => {
            participants.push(participant.name || participant.userName || 'Unknown User');
        });

        const count = participants.length;
        alert(`Participants (${count}):\n${participants.join('\n')}`);
    }

    leaveMeeting() {
        this.handleMeetingLeft();
    }

    handleMeetingLeft() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.peerConnections.forEach((peerConnection, participantId) => {
            this.closePeerConnection(participantId);
        });

        if (this.socket && this.socket.connected) {
            this.socket.emit('leave-meeting', {
                meetingId: this.currentMeetingId,
                participantId: this.participantId
            });
        }

        this.currentMeetingId = null;
        this.currentRoomId = null;
        this.participantId = null;
        this.token = null;
        this.localParticipant = null;
        this.participants.clear();
        this.peerConnections.clear();
        this.remoteStreams.clear();
        this.iceCandidatesQueue.clear();
        this.isAudioEnabled = true;
        this.isVideoEnabled = true;
        this.isScreenSharing = false;

        const videoGrid = document.getElementById('videoGrid');
        if (videoGrid) {
            videoGrid.innerHTML = `
                <div class="video-placeholder">
                    <video id="localVideo" autoplay muted playsinline></video>
                    <div class="participant-overlay">
                        <span id="localName" class="participant-name">Loading...</span>
                        <div class="participant-controls">
                            <span id="localMicIndicator" class="mic-indicator">🎤</span>
                        </div>
                    </div>
                </div>
            `;
        }

        this.showScreen('landing-screen');
        
        setTimeout(() => {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
            this.initializeSocket();
        }, 1000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new MeetingBase();
});
