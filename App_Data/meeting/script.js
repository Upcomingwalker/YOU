class MeetingBase {
    constructor() {
        this.backendUrl = 'https://meeting-base-backend.onrender.com';
        this.socket = null;
        this.currentMeetingId = null;
        this.participantId = null;
        this.localStream = null;
        this.peers = new Map();
        this.streams = new Map();
        this.isAudioEnabled = true;
        this.isVideoEnabled = true;
        this.stunConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
        setTimeout(() => this.initializeApp(), 100);
    }

    async initializeApp() {
        this.loadUserData();
        this.bindEvents();
        this.showScreen('landing-screen');
        this.initSocket();
    }

    initSocket() {
        this.socket = io(this.backendUrl);
        this.socket.on('connect', () => {});
        this.socket.on('joined', async (data) => {
            this.currentMeetingId = data.meetingId;
            this.participantId = data.participantId;
            await this.setupMedia();
            this.showMeetingScreen();
            data.participants.forEach(pid => {
                if (pid !== this.participantId) this.createPeerConnection(pid, true);
            });
        });
        this.socket.on('new-participant', async (pid) => {
            this.createPeerConnection(pid, false);
        });
        this.socket.on('signal', async (msg) => {
            const { from, data } = msg;
            let pc = this.peers.get(from);
            if (!pc) pc = this.createPeerConnection(from, false);
            if (data.sdp) {
                if (data.type === 'offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    this.socket.emit('signal', { to: from, data: pc.localDescription });
                } else if (data.type === 'answer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
            } else if (data.candidate) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                } catch (e) {}
            }
        });
        this.socket.on('participant-left', (pid) => {
            const v = document.getElementById('video-' + pid);
            if (v) v.remove();
            const pc = this.peers.get(pid);
            if (pc) pc.close();
            this.peers.delete(pid);
        });
    }

    loadUserData() {
        const n = localStorage.getItem('meetingbase_username');
        if (n) {
            const i = document.getElementById('userName');
            if (i) i.value = n;
        }
    }

    saveUserData() {
        const i = document.getElementById('userName');
        if (i && i.value.trim()) {
            localStorage.setItem('meetingbase_username', i.value.trim());
        }
    }

    bindEvents() {
        const createBtn = document.getElementById('createMeetingBtn');
        const joinBtn = document.getElementById('joinMeetingBtn');
        const userNameInput = document.getElementById('userName');
        if (createBtn) createBtn.onclick = () => this.handleCreateMeeting();
        if (joinBtn) joinBtn.onclick = () => this.showJoinScreen();
        if (userNameInput) {
            userNameInput.onblur = () => this.saveUserData();
            userNameInput.onkeypress = (e) => {
                if (e.key === 'Enter') this.handleCreateMeeting();
            };
        }
        const joinMeetingBtn = document.getElementById('joinBtn');
        const backBtn = document.getElementById('backToLanding');
        const meetingIdInput = document.getElementById('meetingId');
        if (joinMeetingBtn) joinMeetingBtn.onclick = () => this.handleJoinMeeting();
        if (backBtn) backBtn.onclick = () => this.showScreen('landing-screen');
        if (meetingIdInput) {
            meetingIdInput.oninput = (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
            };
            meetingIdInput.onkeypress = (e) => {
                if (e.key === 'Enter' && e.target.value.length === 6) this.handleJoinMeeting();
            };
        }
        if (document.getElementById('micBtn')) document.getElementById('micBtn').onclick = () => this.toggleMic();
        if (document.getElementById('cameraBtn')) document.getElementById('cameraBtn').onclick = () => this.toggleCamera();
        if (document.getElementById('leaveBtn')) document.getElementById('leaveBtn').onclick = () => this.leaveMeeting();
    }

    showScreen(screenId) {
        Array.from(document.querySelectorAll('.screen')).forEach(s => s.classList.remove('active'));
        const t = document.getElementById(screenId);
        if (t) t.classList.add('active');
    }

    showError(message, containerId = 'error-message') {
        const e = document.getElementById(containerId);
        if (e) {
            e.textContent = message;
            e.classList.add('show');
            setTimeout(() => e.classList.remove('show'), 5000);
        }
    }

    hideError(containerId = 'error-message') {
        const e = document.getElementById(containerId);
        if (e) e.classList.remove('show');
    }

    validateUserName() {
        const i = document.getElementById('userName');
        if (!i || !i.value.trim()) {
            this.showError('Please enter your name first');
            i && i.focus();
            return false;
        }
        return true;
    }

    async handleCreateMeeting() {
        if (!this.validateUserName()) return;
        this.hideError();
        this.showScreen('loading-screen');
        this.updateLoadingText('Creating meeting...');
        const userName = document.getElementById('userName').value.trim();
        const r = await fetch(`${this.backendUrl}/api/create-meeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userName }) });
        const data = await r.json();
        if (data.success) {
            this.socket.emit('join', { meetingId: data.meetingId, userName });
        } else {
            this.showError('Failed to create meeting');
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
        this.updateLoadingText('Joining meeting...');
        const userName = document.getElementById('userName').value.trim();
        const r = await fetch(`${this.backendUrl}/api/join-meeting`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId, userName }) });
        const data = await r.json();
        if (data.success) {
            this.socket.emit('join', { meetingId: data.meetingId, userName });
        } else {
            this.showError('Failed to join meeting', 'join-error-message');
            this.showScreen('join-screen');
        }
    }

    async setupMedia() {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const v = document.getElementById('localVideo');
        if (v) v.srcObject = this.localStream;
        this.localStream.getAudioTracks().forEach(t => t.enabled = this.isAudioEnabled);
        this.localStream.getVideoTracks().forEach(t => t.enabled = this.isVideoEnabled);
    }

    showMeetingScreen() {
        this.showScreen('meeting-screen');
        this.updateMeetingInfo();
        this.updateParticipantCount();
        this.updateControlStates();
        this.setupLocalVideo();
        const userName = document.getElementById('userName').value.trim();
        const localName = document.getElementById('localName');
        if (localName) localName.textContent = userName + ' (You)';
    }

    updateMeetingInfo() {
        const meetingIdDisplay = document.getElementById('currentMeetingId');
        if (meetingIdDisplay) meetingIdDisplay.textContent = this.currentMeetingId || 'Unknown';
    }

    updateParticipantCount() {
        const participantCountEl = document.getElementById('participantCount');
        if (participantCountEl) {
            let count = 1 + this.peers.size;
            participantCountEl.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
        }
    }

    updateControlStates() {
        const micBtn = document.getElementById('micBtn');
        const cameraBtn = document.getElementById('cameraBtn');
        const micIndicator = document.getElementById('localMicIndicator');
        if (micBtn) micBtn.classList.toggle('active', this.isAudioEnabled);
        if (cameraBtn) cameraBtn.classList.toggle('active', this.isVideoEnabled);
        if (micIndicator) micIndicator.textContent = this.isAudioEnabled ? '🎤' : '🔇';
    }

    setupLocalVideo() {
        const v = document.getElementById('localVideo');
        if (v && this.localStream) v.srcObject = this.localStream;
    }

    addRemoteVideo(pid) {
        if (document.getElementById('video-' + pid)) return;
        const grid = document.getElementById('videoGrid');
        if (!grid) return;
        const wrap = document.createElement('div');
        wrap.className = 'video-placeholder';
        wrap.id = 'participant-' + pid;
        wrap.innerHTML = `
            <video id="video-${pid}" autoplay playsinline style="width:100%;height:100%;object-fit:cover;"></video>
            <div class="participant-overlay">
                <span class="participant-name">${pid}</span>
                <div class="participant-controls"><span class="mic-indicator">🎤</span></div>
            </div>`;
        grid.appendChild(wrap);
    }

    createPeerConnection(pid, initiator) {
        this.addRemoteVideo(pid);
        const pc = new RTCPeerConnection(this.stunConfig);
        this.peers.set(pid, pc);
        if (this.localStream) this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
        pc.onicecandidate = (e) => {
            if (e.candidate) this.socket.emit('signal', { to: pid, data: e.candidate });
        };
        pc.ontrack = (e) => {
            const v = document.getElementById('video-' + pid);
            if (v) {
                v.srcObject = e.streams[0];
                v.play();
            }
        };
        if (initiator) {
            pc.onnegotiationneeded = async () => {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.socket.emit('signal', { to: pid, data: pc.localDescription });
            };
        }
        return pc;
    }

    toggleMic() {
        this.isAudioEnabled = !this.isAudioEnabled;
        if (this.localStream) this.localStream.getAudioTracks().forEach(t => t.enabled = this.isAudioEnabled);
        this.updateControlStates();
    }

    toggleCamera() {
        this.isVideoEnabled = !this.isVideoEnabled;
        if (this.localStream) this.localStream.getVideoTracks().forEach(t => t.enabled = this.isVideoEnabled);
        this.updateControlStates();
    }

    leaveMeeting() {
        if (this.localStream) this.localStream.getTracks().forEach(tr => tr.stop());
        for (let [pid, pc] of this.peers) { pc.close(); }
        this.peers.clear();
        this.showScreen('landing-screen');
        document.getElementById('videoGrid').innerHTML = `
            <div class="video-placeholder">
                <video id="localVideo" autoplay muted playsinline></video>
                <div class="participant-overlay">
                    <span id="localName" class="participant-name">Loading...</span>
                    <div class="participant-controls">
                        <span id="localMicIndicator" class="mic-indicator">🎤</span>
                    </div>
                </div>
            </div>`;
    }

    updateLoadingText(text) {
        const l = document.getElementById('loadingText');
        if (l) l.textContent = text;
    }
}

window.addEventListener('DOMContentLoaded', () => { new MeetingBase(); });
