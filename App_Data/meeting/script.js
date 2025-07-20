class MeetingBase {
    constructor() {
        this.apiKey = '364c6c1f-2426-4f4b-a0f1-ff137b39b423';
        this.secret = '2089ec181d92ac7c837285e56418ffd22591472458c15c61ac08724ed33b252d';
        this.apiEndpoint = 'https://api.videosdk.live/v2/rooms';
        
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
        
        setTimeout(() => this.initializeApp(), 100);
    }

    initializeApp() {
        console.log('Initializing Meeting Base app...');
        this.loadUserData();
        this.bindEvents();
        this.showScreen('landing-screen');
        
        if (typeof VideoSDK === 'undefined') {
            console.warn('VideoSDK not loaded, using fallback mode');
        }
        
        console.log('App initialized successfully');
    }

    loadUserData() {
        const savedName = localStorage.getItem('meetingbase_username');
        if (savedName) {
            const nameInput = document.getElementById('userName');
            if (nameInput) {
                nameInput.value = savedName;
                console.log('Loaded saved username:', savedName);
            }
        }
    }

    saveUserData() {
        const nameInput = document.getElementById('userName');
        if (nameInput && nameInput.value.trim()) {
            const userName = nameInput.value.trim();
            localStorage.setItem('meetingbase_username', userName);
            console.log('Saved username:', userName);
        }
    }

    bindEvents() {
        console.log('Binding events...');

        const createBtn = document.getElementById('createMeetingBtn');
        const joinBtn = document.getElementById('joinMeetingBtn');
        const userNameInput = document.getElementById('userName');

        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create meeting button clicked');
                this.handleCreateMeeting();
            });
            console.log('Create button event bound');
        } else {
            console.error('Create button not found');
        }

        if (joinBtn) {
            joinBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Join meeting button clicked');
                this.showJoinScreen();
            });
            console.log('Join button event bound');
        } else {
            console.error('Join button not found');
        }

        if (userNameInput) {
            userNameInput.addEventListener('blur', () => this.saveUserData());
            userNameInput.addEventListener('input', (e) => {
                console.log('Username input:', e.target.value);
            });
            userNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateMeeting();
                }
            });
            console.log('Username input events bound');
        } else {
            console.error('Username input not found');
        }

        const joinMeetingBtn = document.getElementById('joinBtn');
        const backBtn = document.getElementById('backToLanding');
        const meetingIdInput = document.getElementById('meetingId');

        if (joinMeetingBtn) {
            joinMeetingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Join meeting submit button clicked');
                this.handleJoinMeeting();
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Back button clicked');
                this.showScreen('landing-screen');
            });
        }

        if (meetingIdInput) {
            meetingIdInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                console.log('Meeting ID input:', e.target.value);
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
        console.log('Showing screen:', screenId);
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            console.log('Screen activated:', screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
    }

    showError(message, containerId = 'error-message') {
        console.error('Showing error:', message);
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
            console.error('Username input not found');
            return false;
        }
        
        const userName = userNameInput.value.trim();
        console.log('Validating username:', userName);
        
        if (!userName) {
            this.showError('Please enter your name first');
            userNameInput.focus();
            return false;
        }
        return true;
    }

    generateMeetingId() {
        const meetingId = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('Generated meeting ID:', meetingId);
        return meetingId;
    }

    generateToken(meetingId) {
        try {
            console.log('Generating token for meeting:', meetingId);
            
            const payload = {
                apikey: this.apiKey,
                permissions: ['allow_join', 'allow_mod'],
                version: 2,
                exp: Math.floor(Date.now() / 1000) + (120 * 60),
                iat: Math.floor(Date.now() / 1000),
                meetingId: meetingId
            };

            const header = {
                alg: 'HS256',
                typ: 'JWT'
            };

            if (typeof CryptoJS === 'undefined') {
                console.warn('CryptoJS not available, using mock token');
                return 'mock.token.signature';
            }

            const encodedHeader = btoa(JSON.stringify(header))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const encodedPayload = btoa(JSON.stringify(payload))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const signature = CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, this.secret);
            const encodedSignature = CryptoJS.enc.Base64.stringify(signature)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
            console.log('Token generated successfully');
            return token;
        } catch (error) {
            console.error('Error generating token:', error);
            throw new Error('Failed to generate authentication token');
        }
    }

    async createMeetingRoom() {
        try {
            console.log('Creating meeting room...');
            
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
                console.log('Meeting room created:', data.roomId);
                return data.roomId;
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.warn('API error, using fallback room ID');
                return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
        } catch (error) {
            console.warn('Error creating meeting room, using fallback:', error);
            return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    }

    async handleCreateMeeting() {
        console.log('Handling create meeting...');
        
        if (!this.validateUserName()) return;
        
        this.hideError();
        this.showScreen('loading-screen');
        this.updateLoadingText('Creating meeting...');
        
        try {
            const meetingId = this.generateMeetingId();
            const roomId = await this.createMeetingRoom();
            
            this.currentMeetingId = meetingId;
            this.currentRoomId = roomId;
            
            localStorage.setItem(`meeting_${meetingId}`, roomId);
            
            this.updateLoadingText('Generating access token...');
            
            this.token = this.generateToken(roomId);
            
            this.updateLoadingText('Connecting to meeting...');
            
            setTimeout(() => {
                this.showMeetingScreen();
            }, 1500);
            
        } catch (error) {
            console.error('Error creating meeting:', error);
            this.showError('Failed to create meeting. Please try again.');
            this.showScreen('landing-screen');
        }
    }

    showJoinScreen() {
        console.log('Showing join screen...');
        if (!this.validateUserName()) return;
        this.hideError('join-error-message');
        this.showScreen('join-screen');
    }

    async handleJoinMeeting() {
        console.log('Handling join meeting...');
        
        const meetingIdInput = document.getElementById('meetingId');
        if (!meetingIdInput) {
            console.error('Meeting ID input not found');
            return;
        }
        
        const meetingId = meetingIdInput.value.trim();
        console.log('Attempting to join meeting:', meetingId);
        
        if (!this.validateUserName()) return;
        
        if (!meetingId || meetingId.length !== 6) {
            this.showError('Please enter a valid 6-digit meeting ID', 'join-error-message');
            meetingIdInput.focus();
            return;
        }

        this.hideError('join-error-message');
        this.showScreen('loading-screen');
        this.updateLoadingText('Looking for meeting...');
        
        try {
            let roomId = localStorage.getItem(`meeting_${meetingId}`);
            
            if (!roomId) {
                roomId = await this.createMeetingRoom();
                localStorage.setItem(`meeting_${meetingId}`, roomId);
            }
            
            this.currentMeetingId = meetingId;
            this.currentRoomId = roomId;
            
            this.updateLoadingText('Generating access token...');
            
            this.token = this.generateToken(roomId);
            
            this.updateLoadingText('Connecting to meeting...');
            
            setTimeout(() => {
                this.showMeetingScreen();
            }, 1500);
            
        } catch (error) {
            console.error('Error joining meeting:', error);
            this.showError('Failed to join meeting. Please check the meeting ID and try again.', 'join-error-message');
            this.showScreen('join-screen');
        }
    }

    updateLoadingText(text) {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = text;
        }
        console.log('Loading text updated:', text);
    }

    showMeetingScreen() {
        console.log('Showing meeting screen...');
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
        console.log('Setting up local video...');
        const localVideo = document.getElementById('localVideo');
        
        if (localVideo && navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ 
                video: this.isVideoEnabled, 
                audio: this.isAudioEnabled 
            }).then(stream => {
                localVideo.srcObject = stream;
                this.localStream = stream;
                console.log('Local video stream established');
            }).catch(err => {
                console.error('Error accessing media devices:', err);
                localVideo.style.backgroundColor = '#1a1a1a';
            });
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
            const count = this.participants.size + 1;
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
        console.log('Mic toggled:', this.isAudioEnabled);
        
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
        console.log('Camera toggled:', this.isVideoEnabled);
        
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = this.isVideoEnabled;
            });
        }
        
        this.updateControlStates();
    }

    async toggleScreenShare() {
        console.log('Screen share toggled');
        const screenBtn = document.getElementById('screenBtn');
        
        try {
            if (this.isScreenSharing) {
                this.isScreenSharing = false;
                if (screenBtn) screenBtn.classList.remove('active');
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
            console.error('Error toggling screen share:', error);
            this.showError('Failed to toggle screen sharing');
        }
    }

    showParticipantsList() {
        const count = this.participants.size + 1;
        const userName = document.getElementById('userName').value.trim();
        const allNames = [userName + ' (You)', ...Array.from(this.participants.values()).map(p => p.displayName)];
        
        alert(`Participants (${count}):\n${allNames.join('\n')}`);
    }

    leaveMeeting() {
        console.log('Leaving meeting...');
        this.handleMeetingLeft();
    }

    handleMeetingLeft() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
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
                <div class="video-placeholder local-video">
                    <video id="localVideo" autoplay muted playsinline></video>
                    <div class="participant-overlay">
                        <span class="participant-name" id="localName">You</span>
                        <div class="participant-controls">
                            <span class="mic-indicator" id="localMicIndicator">🎤</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const meetingIdInput = document.getElementById('meetingId');
        if (meetingIdInput) {
            meetingIdInput.value = '';
        }
        
        this.showScreen('landing-screen');
        console.log('Returned to landing screen');
    }
}

let meetingBaseInstance = null;

function initializeMeetingBase() {
    console.log('Initializing Meeting Base instance...');
    if (!meetingBaseInstance) {
        meetingBaseInstance = new MeetingBase();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMeetingBase);
} else {
    initializeMeetingBase();
}

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (meetingBaseInstance) {
        meetingBaseInstance.showError('An unexpected error occurred. Please refresh the page.');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});
