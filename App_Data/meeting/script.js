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
        const userName = document.getElementById('userName').value.trim();
        const response = await fetch(`${this.backendUrl}/api/join-meeting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ meetingId, userName })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
            this.currentMeetingId = data.meetingId;
            this.currentRoomId = data.roomId;
            this.participantId = data.participantId;
            this.token = data.token;

            this.updateLoadingText('Joining meeting...');
            await this.initializeMeeting();

            setTimeout(() => {
                this.showMeetingScreen();
            }, 1500);
        } else {
            throw new Error(data.error || 'Failed to join meeting');
        }
    } catch (error) {
        console.error('Error joining meeting:', error);
        let errorMessage = 'Failed to join meeting. ';
        
        if (error.message.includes('Meeting not found')) {
            errorMessage += 'The meeting ID does not exist or has expired.';
        } else if (error.message.includes('fetch')) {
            errorMessage += 'Please check your internet connection.';
        } else {
            errorMessage += 'Please try again.';
        }
        
        this.showError(errorMessage, 'join-error-message');
        this.showScreen('join-screen');
    }
}
