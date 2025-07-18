let socket;
let currentUser = null;
let currentChatId = null;
let connectedUsers = new Map();
let chatHistory = new Map();

const BACKEND_URL = 'https://firebase-chat-backend.onrender.com/';

class FirebaseChats {
    constructor() {
        this.init();
    }

    init() {
        this.setupSocket();
        this.loadUserData();
        this.setupEventListeners();
        this.generateConnectionId();
    }

    setupSocket() {
        socket = io(BACKEND_URL);
        
        socket.on('connect', () => {
            console.log('Connected to server');
            if (currentUser) {
                socket.emit('user-connected', currentUser);
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        socket.on('chat-message', (data) => {
            this.handleIncomingMessage(data);
        });

        socket.on('user-connected', (userData) => {
            this.handleUserConnected(userData);
        });

        socket.on('connect-success', (data) => {
            this.handleConnectSuccess(data);
        });

        socket.on('connect-error', (error) => {
            this.showNotification('Connection failed: ' + error.message, 'error');
        });
    }

    loadUserData() {
        const savedUser = localStorage.getItem('firebaseChatsUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            this.updateUserDisplay();
        }

        const savedChats = localStorage.getItem('firebaseChatsHistory');
        if (savedChats) {
            chatHistory = new Map(JSON.parse(savedChats));
            this.updateChatList();
        }
    }

    saveUserData() {
        localStorage.setItem('firebaseChatsUser', JSON.stringify(currentUser));
        localStorage.setItem('firebaseChatsHistory', JSON.stringify([...chatHistory]));
    }

    generateConnectionId() {
        if (!currentUser?.connectionId) {
            const connectionId = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!currentUser) {
                currentUser = { username: 'User', connectionId };
            } else {
                currentUser.connectionId = connectionId;
            }
            this.updateUserDisplay();
            this.saveUserData();
        }
    }

    updateUserDisplay() {
        if (currentUser) {
            document.getElementById('username').textContent = currentUser.username;
            document.getElementById('userConnectionId').textContent = currentUser.connectionId;
        }
    }

    setupEventListeners() {
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        document.getElementById('connectIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.connectToUser();
            }
        });

        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveUsername();
            }
        });
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();

        if (!message || !currentChatId) return;

        const messageData = {
            id: Date.now().toString(),
            text: message,
            sender: currentUser.connectionId,
            senderName: currentUser.username,
            timestamp: new Date().toISOString(),
            chatId: currentChatId
        };

        socket.emit('chat-message', messageData);
        
        this.addMessageToChat(currentChatId, messageData);
        this.displayMessage(messageData, true);
        
        messageInput.value = '';
        this.scrollToBottom();
    }

    handleIncomingMessage(messageData) {
        if (messageData.sender !== currentUser.connectionId) {
            this.addMessageToChat(messageData.chatId, messageData);
            
            if (messageData.chatId === currentChatId) {
                this.displayMessage(messageData, false);
                this.scrollToBottom();
            }
            
            this.updateChatLastMessage(messageData.chatId, messageData.text);
        }
    }

    displayMessage(messageData, isSent) {
        const messagesContainer = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
        messageElement.textContent = messageData.text;
        
        messagesContainer.appendChild(messageElement);
    }

    addMessageToChat(chatId, messageData) {
        if (!chatHistory.has(chatId)) {
            chatHistory.set(chatId, []);
        }
        chatHistory.get(chatId).push(messageData);
        this.saveUserData();
    }

    connectToUser() {
        const connectIdInput = document.getElementById('connectIdInput');
        const targetId = connectIdInput.value.trim();

        if (!targetId) {
            this.showNotification('Please enter a connection ID', 'error');
            return;
        }

        if (targetId === currentUser.connectionId) {
            this.showNotification('Cannot connect to yourself', 'error');
            return;
        }

        if (connectedUsers.has(targetId)) {
            this.showNotification('Already connected to this user', 'error');
            return;
        }

        socket.emit('connect-to-user', {
            myId: currentUser.connectionId,
            targetId: targetId,
            myUsername: currentUser.username
        });

        connectIdInput.value = '';
    }

    handleConnectSuccess(data) {
        const { targetUser, chatId } = data;
        
        connectedUsers.set(targetUser.connectionId, targetUser);
        
        if (!chatHistory.has(chatId)) {
            chatHistory.set(chatId, []);
        }
        
        this.updateChatList();
        this.selectChat(chatId, targetUser);
        this.showNotification(`Connected to ${targetUser.username}`, 'success');
        this.saveUserData();
    }

    handleUserConnected(userData) {
        connectedUsers.set(userData.connectionId, userData);
        this.updateChatList();
    }

    updateChatList() {
        const chatList = document.getElementById('chatList');
        
        if (connectedUsers.size === 0) {
            chatList.innerHTML = `
                <div class="no-chats">
                    <i class="fas fa-comments"></i>
                    <p>No chats yet</p>
                    <span>Connect with someone to start chatting</span>
                </div>
            `;
            return;
        }

        chatList.innerHTML = '';
        
        connectedUsers.forEach((userData, userId) => {
            const chatId = this.generateChatId(currentUser.connectionId, userId);
            const lastMessage = this.getLastMessage(chatId);
            
            const chatElement = document.createElement('div');
            chatElement.className = `chat-item ${currentChatId === chatId ? 'active' : ''}`;
            chatElement.onclick = () => this.selectChat(chatId, userData);
            
            chatElement.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-name">${userData.username}</div>
                    <div class="chat-last-message">${lastMessage || 'No messages yet'}</div>
                </div>
            `;
            
            chatList.appendChild(chatElement);
        });
    }

    selectChat(chatId, userData) {
        currentChatId = chatId;
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        event.currentTarget?.classList.add('active');
        
        this.updateChatHeader(userData);
        this.loadChatMessages(chatId);
        this.enableMessageInput();
    }

    updateChatHeader(userData) {
        const chatHeader = document.getElementById('chatHeader');
        chatHeader.innerHTML = `
            <div class="chat-user-info">
                <div class="chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-user-details">
                    <div class="chat-username">${userData.username}</div>
                    <div class="chat-status">ID: ${userData.connectionId}</div>
                </div>
            </div>
        `;
    }

    loadChatMessages(chatId) {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        const messages = chatHistory.get(chatId) || [];
        
        messages.forEach(messageData => {
            const isSent = messageData.sender === currentUser.connectionId;
            this.displayMessage(messageData, isSent);
        });
        
        this.scrollToBottom();
    }

    enableMessageInput() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.placeholder = 'Type a message...';
        messageInput.focus();
    }

    getLastMessage(chatId) {
        const messages = chatHistory.get(chatId) || [];
        return messages.length > 0 ? messages[messages.length - 1].text : null;
    }

    updateChatLastMessage(chatId, message) {
        const truncatedMessage = message.length > 30 ? message.substring(0, 30) + '...' : message;
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name').textContent;
            const userData = Array.from(connectedUsers.values()).find(u => u.username === chatName);
            
            if (userData && this.generateChatId(currentUser.connectionId, userData.connectionId) === chatId) {
                item.querySelector('.chat-last-message').textContent = truncatedMessage;
            }
        });
    }

    generateChatId(userId1, userId2) {
        return [userId1, userId2].sort().join('-');
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            background: ${type === 'error' ? 'linear-gradient(135deg, #ff6b6b, #ff5252)' : 'linear-gradient(135deg, #4CAF50, #45a049)'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

function editUsername() {
    const usernameInput = document.getElementById('usernameInput');
    if (currentUser) {
        usernameInput.value = currentUser.username;
    }
    showUsernameModal();
}

function saveUsername() {
    const usernameInput = document.getElementById('usernameInput');
    const username = usernameInput.value.trim();
    
    if (!username) {
        app.showNotification('Please enter a username', 'error');
        return;
    }
    
    if (!currentUser) {
        currentUser = { username, connectionId: '' };
    } else {
        currentUser.username = username;
    }
    
    app.updateUserDisplay();
    app.saveUserData();
    closeUsernameModal();
    app.showNotification('Username updated successfully', 'success');
}

function showUsernameModal() {
    document.getElementById('usernameModal').classList.add('show');
}

function closeUsernameModal() {
    document.getElementById('usernameModal').classList.remove('show');
}

function showInfo() {
    document.getElementById('infoModal').classList.add('show');
}

function closeInfo() {
    document.getElementById('infoModal').classList.remove('show');
}

function openDashboard() {
    window.location.href = 'index.html';
}

function connectToUser() {
    app.connectToUser();
}

function sendMessage() {
    app.sendMessage();
}

const app = new FirebaseChats();

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
