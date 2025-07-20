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
        
        this.saveUserData();
        this.showDashboard();
        this.initializePubNub();
    }

    setupMessageHandlers() {
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput) {
            messageInput.addEventListener('input', () => {
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
            this.hideLoadingOverlay();
            this.showNotification('Connection failed. Please refresh the page.');
        }
    }

    handleIncomingMessage(messageEvent) {
        const message = messageEvent.message;
        const senderId = message.senderId.toString();
        
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
            if (contact.name.startsWith('User ') && message.senderName) {
                contact.name = message.senderName;
            }
        }
        
        this.saveUserData();
        this.renderContacts();
        
        if (this.activeContact && this.activeContact.id === senderId) {
            this.renderMessages();
            this.scrollToBottom();
        }
        
        if (!this.activeContact || this.activeContact.id !== senderId) {
            this.showNotification(`New message from ${message.senderName || senderId}`);
        }
    }

    handleIncomingSignal(signalEvent) {
        const signal = signalEvent.message;
        const senderId = signal.senderId?.toString();
        
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
        contactId = contactId.toString();
        
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
        const contact = this.contacts.find(c => c.id === contactId.toString());
        
        if (!contact) {
            return;
        }
        
        this.activeContact = contact;
        
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
        this.scrollToBottom();
    }

    updateActiveContactUI() {
        if (!this.activeContact) return;
        
        const initial = this.activeContact.name.charAt(0).toUpperCase();
        const chatUserInitial = document.getElementById('chatUserInitial');
        const chatUsername = document.getElementById('chatUsername');
        const chatConnectionId = document.getElementById('chatConnectionId');
        
        if (chatUserInitial) chatUserInitial.textContent = initial;
        if (chatUsername) chatUsername.textContent = this.activeContact.name;
        if (chatConnectionId) chatConnectionId.textContent = this.activeContact.id;
    }

    showActiveChat() {
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
        if (!this.activeContact || !text.trim() || !this.pubnub) {
            return;
        }
        
        const message = {
            senderId: this.currentUser.connectionId.toString(),
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
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.value = '';
        }
        this.updateSendButton();
        this.scrollToBottom();
    }

    sendTypingIndicator() {
        if (!this.activeContact || !this.pubnub) return;
        
        this.pubnub.signal({
            channel: `user_${this.activeContact.id}`,
            message: {
                senderId: this.currentUser.connectionId.toString(),
                type: 'typing'
            }
        });
    }

    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = '<div class="no-contacts">No contacts yet. Add someone using their Connection ID!</div>';
            return;
        }
        
        const sortedContacts = [...this.contacts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        contactsList.innerHTML = sortedContacts.map(contact => {
            const initial = contact.name.charAt(0).toUpperCase();
            const timeStr = contact.timestamp ? this.formatTime(contact.timestamp) : '';
            
            return `
                <div class="contact-item" data-contact-id="${contact.id}">
                    <div class="contact-avatar">
                        ${initial}
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${contact.name}</div>
                        <div class="contact-id">ID: ${contact.id}</div>
                        ${contact.lastMessage ? `<div class="contact-last-message">${contact.lastMessage}</div>` : ''}
                    </div>
                    ${timeStr ? `<div class="contact-time">${timeStr}</div>` : ''}
                </div>
            `;
        }).join('');
        
        contactsList.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const contactId = item.getAttribute('data-contact-id');
                this.selectContact(contactId);
            });
        });
    }

    renderMessages() {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList || !this.activeContact) return;
        
        const messages = this.messages[this.activeContact.id] || [];
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<div style="text-align: center; color: #b9bbbe; padding: 20px;">No messages yet. Start the conversation!</div>';
            return;
        }
        
        messagesList.innerHTML = messages.map(message => {
            const timeStr = this.formatTime(message.timestamp);
            const messageClass = message.type === 'sent' ? 'sent' : 'received';
            
            return `
                <div class="message ${messageClass}">
                    <div class="message-bubble">
                        <div class="message-text">${this.escapeHtml(message.text)}</div>
                        <div class="message-meta">
                            <span class="message-time">${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.scrollToBottom();
    }

    scrollToBottom() {
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            setTimeout(() => {
                messagesList.scrollTop = messagesList.scrollHeight;
            }, 100);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (messageDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.textContent = `${this.activeContact.name} is typing...`;
            typingIndicator.style.display = 'block';
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    showLoadingOverlay(message) {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div id="loadingMessage">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            document.getElementById('loadingMessage').textContent = message;
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
        const toast = document.createElement('div');
        toast.className = 'notification-toast show';
        toast.innerHTML = `<div class="toast-content">${message}</div>`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FirebaseChatApp();
});
