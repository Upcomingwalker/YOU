class FirebaseChatApp {
    constructor() {
        this.pubnub = null;
        this.currentUser = null;
        this.contacts = [];
        this.messages = {};
        this.activeContact = null;
        this.typingTimer = null;
        this.isTyping = false;
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        if (this.currentUser) {
            this.showDashboard();
            this.initializePubNub();
        } else {
            this.showLoginScreen();
        }
    }

    loadUserData() {
        const userData = localStorage.getItem('firebasechat_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }

        const contactsData = localStorage.getItem('firebasechat_contacts');
        if (contactsData) {
            this.contacts = JSON.parse(contactsData);
        }

        const messagesData = localStorage.getItem('firebasechat_messages');
        if (messagesData) {
            this.messages = JSON.parse(messagesData);
        }
    }

    saveUserData() {
        localStorage.setItem('firebasechat_user', JSON.stringify(this.currentUser));
        localStorage.setItem('firebasechat_contacts', JSON.stringify(this.contacts));
        localStorage.setItem('firebasechat_messages', JSON.stringify(this.messages));
    }

    generateConnectionId() {
        return Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000;
    }

    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('chatDashboard').classList.add('hidden');
    }

    showDashboard() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('chatDashboard').classList.remove('hidden');
        this.updateUserInterface();
        this.renderContacts();
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        const initial = this.currentUser.username.charAt(0).toUpperCase();
        document.getElementById('headerUsername').textContent = this.currentUser.username;
        document.getElementById('headerConnectionId').textContent = this.currentUser.connectionId;
        document.getElementById('userInitial').textContent = initial;
        document.getElementById('sidebarUsername').textContent = this.currentUser.username;
        document.getElementById('sidebarConnectionId').textContent = this.currentUser.connectionId;
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const addContactForm = document.querySelector('.add-contact-form');
        if (addContactForm) {
            addContactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const contactId = document.getElementById('contactId').value.trim();
                if (contactId) {
                    this.addContact(contactId);
                    document.getElementById('contactId').value = '';
                }
            });
        }
        this.setupMessageHandlers();
    }

    handleLogin() {
        const usernameInput = document.getElementById('username');
        const username = usernameInput?.value?.trim();

        if (!username) {
            this.showNotification('Please enter a valid username');
            return;
        }

        if (username.length < 2) {
            this.showNotification('Username must be at least 2 characters');
            return;
        }

        this.currentUser = {
            username: username,
            connectionId: this.generateConnectionId()
        };

        console.log('User created:', this.currentUser);
        
        this.saveUserData();
        this.showDashboard();
        this.initializePubNub();
    }

    setupMessageHandlers() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        if (messageInput) {
            messageInput.addEventListener('input', (e) => {
                this.updateSendButton();
                this.handleTyping();
            });

            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(messageInput.value);
                }
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => {
                if (messageInput) {
                    this.sendMessage(messageInput.value);
                }
            });
        }
    }

    updateSendButton() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput && sendButton) {
            const hasText = messageInput.value.trim().length > 0;
            sendButton.disabled = !hasText || !this.activeContact;
        }
    }

    handleTyping() {
        if (!this.activeContact || this.isTyping) return;

        this.isTyping = true;
        this.sendTypingIndicator();

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.isTyping = false;
        }, 1000);
    }

    initializePubNub() {
        this.showLoadingOverlay('Connecting to chat server...');

        try {
            this.pubnub = new PubNub({
                publishKey: "pub-c-8b6c86be-c1d2-4f31-8cec-2145b570ae31",
                subscribeKey: "sub-c-b3123e05-c10e-42eb-abd2-b31dae2a9d5f",
                secretKey: "sec-c-NzU1NTVjZAtMTZhZS00MGNiLWE5MzctODM4ZDY5YmZhZjg3",
                uuid: `user_${this.currentUser.connectionId}`,
                ssl: true
            });

            this.pubnub.addListener({
                message: (messageEvent) => this.handleIncomingMessage(messageEvent),
                signal: (signalEvent) => this.handleIncomingSignal(signalEvent),
                status: (statusEvent) => this.handlePubNubStatus(statusEvent)
            });

            this.pubnub.subscribe({
                channels: [`user_${this.currentUser.connectionId}`]
            });

            setTimeout(() => {
                this.hideLoadingOverlay();
                this.showNotification('Connected successfully!');
            }, 1500);

        } catch (error) {
            console.error('PubNub initialization error:', error);
            this.hideLoadingOverlay();
            this.showNotification('Connection failed. Please refresh the page.');
        }
    }

    handleIncomingMessage(messageEvent) {
        const message = messageEvent.message;
        const senderId = message.senderId;

        if (!this.contacts.find(c => c.id === senderId)) {
            this.addContact(senderId, message.senderName, false);
        }

        if (!this.messages[senderId]) {
            this.messages[senderId] = [];
        }

        this.messages[senderId].push({
            ...message,
            type: 'received'
        });

        const contact = this.contacts.find(c => c.id === senderId);
        if (contact) {
            contact.lastMessage = message.text;
            contact.timestamp = Date.now();
        }

        this.saveUserData();
        this.renderContacts();

        if (this.activeContact && this.activeContact.id === senderId) {
            this.renderMessages();
        }

        if (!this.activeContact || this.activeContact.id !== senderId) {
            this.showNotification(`New message from ${message.senderName}`);
        }
    }

    handleIncomingSignal(signalEvent) {
        const signal = signalEvent.message;
        const senderId = signal.senderId;

        if (signal.type === 'typing' && this.activeContact && this.activeContact.id === senderId) {
            this.showTypingIndicator();
            setTimeout(() => this.hideTypingIndicator(), 3000);
        }
    }

    handlePubNubStatus(statusEvent) {
        if (statusEvent.category === "PNConnectedCategory") {
            console.log("Connected to PubNub");
        } else if (statusEvent.category === "PNNetworkDownCategory") {
            this.showNotification('Connection lost. Reconnecting...');
        } else if (statusEvent.category === "PNReconnectedCategory") {
            this.showNotification('Reconnected!');
        }
    }

    addContact(contactId, contactName = null, showNotification = true) {
        if (!/^\d{5}$/.test(contactId)) {
            this.showNotification('Please enter a valid 5-digit Connection ID');
            return false;
        }

        if (contactId === this.currentUser.connectionId.toString()) {
            this.showNotification('You cannot add yourself as a contact');
            return false;
        }

        if (this.contacts.find(c => c.id === contactId)) {
            this.showNotification('Contact already exists');
            return false;
        }

        const contact = {
            id: contactId,
            name: contactName || `User ${contactId}`,
            lastMessage: '',
            timestamp: Date.now()
        };

        this.contacts.push(contact);
        this.messages[contactId] = [];
        this.saveUserData();
        this.renderContacts();

        if (showNotification) {
            this.showNotification(`Contact ${contactId} added successfully!`);
        }

        return true;
    }

    selectContact(contactId) {
        console.log('Selecting contact:', contactId);
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) {
            console.log('Contact not found:', contactId);
            return;
        }

        this.activeContact = contact;
        console.log('Active contact set:', this.activeContact);
        
        this.updateActiveContactUI();
        this.renderMessages();
        this.showActiveChat();

        document.querySelectorAll('.contact-item').forEach(item => {
            item.classList.remove('active');
        });

        const contactElement = document.querySelector(`[data-contact-id="${contactId}"]`);
        if (contactElement) {
            contactElement.classList.add('active');
        }
        this.updateSendButton();
    }

    updateActiveContactUI() {
        if (!this.activeContact) return;

        const initial = this.activeContact.name.charAt(0).toUpperCase();
        document.getElementById('chatUserInitial').textContent = initial;
        document.getElementById('chatUsername').textContent = this.activeContact.name;
        document.getElementById('chatConnectionId').textContent = this.activeContact.id;
    }

    showActiveChat() {
        console.log('Showing active chat');
        const welcomeMsg = document.getElementById('welcomeMessage');
        const activeChatArea = document.getElementById('activeChatArea');

        if (welcomeMsg && activeChatArea) {
            welcomeMsg.classList.add('hidden');
            activeChatArea.classList.remove('hidden');

            setTimeout(() => {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.focus();
                }
            }, 100);
        }
    }

    sendMessage(text) {
        if (!this.activeContact || !text.trim() || !this.pubnub) return;

        const message = {
            senderId: this.currentUser.connectionId,
            senderName: this.currentUser.username,
            text: text.trim(),
            timestamp: Date.now(),
            type: 'message'
        };

        this.pubnub.publish({
            channel: `user_${this.activeContact.id}`,
            message: message
        });

        if (!this.messages[this.activeContact.id]) {
            this.messages[this.activeContact.id] = [];
        }

        this.messages[this.activeContact.id].push({
            ...message,
            type: 'sent'
        });

        this.activeContact.lastMessage = text.trim();
        this.activeContact.timestamp = Date.now();

        this.saveUserData();
        this.renderMessages();
        this.renderContacts();

        document.getElementById('messageInput').value = '';
        this.updateSendButton();
    }

    sendTypingIndicator() {
        if (!this.activeContact || !this.pubnub) return;

        this.pubnub.signal({
            channel: `user_${this.activeContact.id}`,
            message: {
                senderId: this.currentUser.connectionId,
                type: 'typing'
            }
        });
    }

    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = '<div class="no-contacts">No contacts yet. Add someone using their Connection ID!</div>';
            return;
        }

        const sortedContacts = this.contacts.sort((a, b) => b.timestamp - a.timestamp);
        
        contactsList.innerHTML = sortedContacts.map(contact => {
            const lastMessage = contact.lastMessage || 'No messages yet';
            const timeStr = contact.timestamp ? this.formatTime(contact.timestamp) : '';
            const initial = contact.name.charAt(0).toUpperCase();
            
            return `
                <div class="contact-item ${this.activeContact && this.activeContact.id === contact.id ? 'active' : ''}" 
                     data-contact-id="${contact.id}" onclick="app.selectContact('${contact.id}')">
                    <div class="contact-avatar">
                        <div class="avatar-initial">${initial}</div>
                        <div class="status-dot online"></div>
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-id">${contact.id}</div>
                        <div class="contact-last-message">${lastMessage}</div>
                    </div>
                    <div class="contact-time">${timeStr}</div>
                </div>
            `;
        }).join('');
    }

    renderMessages() {
        if (!this.activeContact) return;

        const messagesList = document.getElementById('messagesList');
        const messages = this.messages[this.activeContact.id] || [];

        if (messages.length === 0) {
            messagesList.innerHTML = '<div style="text-align: center; color: #b9bbbe; padding: 20px;">No messages yet. Start the conversation!</div>';
            return;
        }

        messagesList.innerHTML = messages.map(message => {
            const timeStr = this.formatTime(message.timestamp);
            return `
                <div class="message ${message.type}">
                    <div class="message-bubble">
                        <div class="message-text">${message.text}</div>
                        <div class="message-meta">
                            <span class="message-sender">${message.senderName || 'Unknown'}</span>
                            <span class="message-time">${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        messagesList.scrollTop = messagesList.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }

    showTypingIndicator() {
        const typingElement = document.getElementById('typingIndicator');
        if (typingElement) {
            typingElement.textContent = `${this.activeContact.name} is typing...`;
            typingElement.classList.remove('hidden');
        }
    }

    hideTypingIndicator() {
        const typingElement = document.getElementById('typingIndicator');
        if (typingElement) {
            typingElement.classList.add('hidden');
        }
    }

    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');
        
        if (overlay && loadingMessage) {
            loadingMessage.textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showNotification(message) {
        const toast = document.getElementById('notificationToast');
        const content = document.getElementById('toastContent');
        
        if (toast && content) {
            content.textContent = message;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        } else {
            alert(message);
        }
    }

    logout() {
        localStorage.clear();
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.app = new FirebaseChatApp();
});
