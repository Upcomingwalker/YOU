class MeetingBase {
    constructor() {
        this.apiKey = '364c6c1f-2426-4f4b-a0f1-ff137b39b423';
        this.secret = '2089ec181d92ac7c837285e56418ffd22591472458c15c61ac08724ed33b252d';
        this.apiEndpoint = 'https://api.videosdk.live/v2/rooms';
        this.validateEndpoint = 'https://api.videosdk.live/v1/meetings';
        this.meeting = null;
        this.currentMeetingId = null;
        this.currentRoomId = null;
        this.token = null;
        this.localParticipant = null;
        this.isAudioEnabled = true;
        this.isVideoEnabled = true;
        this.isScreenSharing = false;
        this.localStream = null;
        this.participants = new Map();
        this.meetingStorage = {};
        this.centralMeetings = {};
        setTimeout(() => this.initializeApp(), 100);
    }

    initializeApp() {
        this.loadUserData();
        this.bindEvents();
        this.showScreen('landing-screen');
        this.loadCentralMeetings();
    }

    loadCentralMeetings() {
        const stored = localStorage.getItem('centralMeetingRegistry');
        if (stored) {
            this.centralMeetings = JSON.parse(stored);
        }
    }

    saveCentralMeetings() {
        localStorage.setItem('centralMeetingRegistry', JSON.stringify(this.centralMeetings));
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

    generateMeetingId() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    generateToken(roomId) {
        try {
            const payload = {
                apikey: this.apiKey,
                permissions: ['allow_join', 'allow_mod'],
                version: 2,
                exp: Math.floor(Date.now() / 1000) + (120 * 60),
                iat: Math.floor(Date.now() / 1000),
                roomId: roomId
            };

            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            const encodedHeader = btoa(JSON.stringify(header))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const encodedPayload = btoa(JSON.stringify(payload))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');

            const signature = this.generateSignature(encodedHeader + '.' + encodedPayload);
            return `${encodedHeader}.${encodedPayload}.${signature}`;
        } catch (error) {
            throw new Error('Failed to generate authentication token');
        }
    }

    generateSignature(data) {
        const hash = this.simpleHash(data + this.secret);
        return btoa(hash).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    async createMeetingRoom() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': this.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                return data.roomId;
            } else {
                return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        } catch (error) {
            return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    async validateMeetingExists(meetingId) {
        if (this.centralMeetings[meetingId]) {
            return {
                exists: true,
                roomId: this.centralMeetings[meetingId].roomId
            };
        }

        try {
            const tempToken = this.generateToken('temp');
            const response = await fetch(`${this.validateEndpoint}/${meetingId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tempToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    exists: true,
                    roomId: data.meetingId || data.roomId
                };
            }
            
            return { exists: false };
        } catch (error) {
            return { exists: false };
        }
    }

    async handleCreateMeeting() {
        if (!this.validateUserName()) return;

        this.hideError();
        this.showScreen('loading-screen');
        this.updateLoadingText('Creating meeting...');

        try {
            const meetingId = this.generateMeetingId();
            const roomId = await this.createMeetingRoom();
            
            this.currentMeetingId = meetingId;
            this.currentRoomId = roomId;

            this.centralMeetings[meetingId] = {
                roomId: roomId,
                participants: [],
                createdAt: Date.now(),
                createdBy: document.getElementById('userName').value.trim()
            };
            
            this.saveCentralMeetings();

            this.updateLoadingText('Generating access token...');
            this.token = this.generateToken(roomId);

            this.updateLoadingText('Connecting to meeting...');
            await this.initializeMeeting();

            setTimeout(() => {
                this.showMeetingScreen();
            }, 1500);
        } catch (error) {
            this.showError('Failed to create meeting. Please try again.');
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
        if (!meetingIdInput) return;

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
            const validation = await this.validateMeetingExists(meetingId);
            
            if (!validation.exists) {
                this.showError('Meeting not found. Please check the meeting ID and try again.', 'join-error-message');
                this.showScreen('join-screen');
                return;
            }

            this.updateLoadingText('Meeting found. Connecting...');
            
            this.currentMeetingId = meetingId;
            this.currentRoomId = validation.roomId;

            if (this.centralMeetings[meetingId]) {
                const userName = document.getElementById('userName').value.trim();
                const existingParticipant = this.centralMeetings[meetingId].participants.find(p => p.name === userName);
                
                if (!existingParticipant) {
                    this.centralMeetings[meetingId].participants.push({
                        id: Date.now().toString(),
                        name: userName,
                        joinedAt: Date.now()
                    });
                    this.saveCentralMeetings();
                }
            }

            this.updateLoadingText('Generating access token...');
            this.token = this.generateToken(validation.roomId);

            this.updateLoadingText('Joining meeting...');
            await this.initializeMeeting();

            setTimeout(() => {
                this.showMeetingScreen();
            }, 1500);
        } catch (error) {
            this.showError('Failed to validate meeting. Please try again.', 'join-error-message');
            this.showScreen('join-screen');
        }
    }

    async initializeMeeting() {
        const userName = document.getElementById('userName').value.trim();
        
        this.localParticipant = {
            id: Date.now().toString(),
            displayName: userName,
            isLocal: true
        };

        await this.setupMediaStreams();
        this.simulateRemoteParticipants();
    }

    simulateRemoteParticipants() {
        if (this.centralMeetings[this.currentMeetingId]) {
            const currentUser = document.getElementById('userName').value.trim();
            const remoteParticipants = this.centralMeetings[this.currentMeetingId].participants
                .filter(p => p.name !== currentUser);

            setTimeout(() => {
                this.addRemoteParticipants(remoteParticipants);
            }, 2000);
        }
    }

    addRemoteParticipants(participants) {
        const videoGrid = document.getElementById('videoGrid');
        if (!videoGrid) return;

        participants.forEach((participant, index) => {
            setTimeout(() => {
                const videoPlaceholder = document.createElement('div');
                videoPlaceholder.className = 'video-placeholder';
                videoPlaceholder.innerHTML = `
                    <div style="background: linear-gradient(45deg, #1a1a1a, #333); display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #fff; width: 100%; height: 100%;">
                        ${participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="participant-overlay">
                        <span class="participant-name">${participant.name}</span>
                        <div class="participant-controls">
                            <span class="mic-indicator">🎤</span>
                        </div>
                    </div>
                `;
                videoGrid.appendChild(videoPlaceholder);
                this.updateParticipantCount();
            }, index * 1000);
        });
    }

    async setupMediaStreams() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: this.isVideoEnabled,
                audio: this.isAudioEnabled
            });
        } catch (error) {
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
            let count = 1;
            if (this.centralMeetings[this.currentMeetingId]) {
                count = this.centralMeetings[this.currentMeetingId].participants.length;
            }
            const videoGrid = document.getElementById('videoGrid');
            if (videoGrid) {
                count = Math.max(count, videoGrid.children.length);
            }
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
            } else {
                if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const localVideo = document.getElementById('localVideo');
                    if (localVideo) {
                        localVideo.srcObject = stream;
                    }
                    this.isScreenSharing = true;
                    if (screenBtn) screenBtn.classList.add('active');
                } else {
                    this.showError('Screen sharing is not supported in this browser.');
                }
            }
        } catch (error) {
            this.showError('Failed to toggle screen sharing');
        }
    }

    showParticipantsList() {
        let participants = [document.getElementById('userName').value.trim() + ' (You)'];
        
        if (this.centralMeetings[this.currentMeetingId]) {
            const currentUser = document.getElementById('userName').value.trim();
            const otherParticipants = this.centralMeetings[this.currentMeetingId].participants
                .filter(p => p.name !== currentUser)
                .map(p => p.name);
            participants = participants.concat(otherParticipants);
        }

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

        if (this.centralMeetings[this.currentMeetingId]) {
            const userName = document.getElementById('userName').value.trim();
            this.centralMeetings[this.currentMeetingId].participants = 
                this.centralMeetings[this.currentMeetingId].participants.filter(p => p.name !== userName);
            this.saveCentralMeetings();
        }

        this.meeting = null;
        this.currentMeetingId = null;
        this.currentRoomId = null;
        this.token = null;
        this.localParticipant = null;
        this.participants.clear();
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
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new MeetingBase();
});
