const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let connectedUsers = new Map();
let chatRooms = new Map();

class ChatServer {
    constructor() {
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        io.on('connection', (socket) => {
            console.log(`User connected: ${socket.id}`);

            socket.on('user-connected', (userData) => {
                this.handleUserConnection(socket, userData);
            });

            socket.on('connect-to-user', (data) => {
                this.handleConnectToUser(socket, data);
            });

            socket.on('chat-message', (messageData) => {
                this.handleChatMessage(socket, messageData);
            });

            socket.on('disconnect', () => {
                this.handleDisconnection(socket);
            });
        });
    }

    handleUserConnection(socket, userData) {
        socket.userData = userData;
        connectedUsers.set(userData.connectionId, {
            ...userData,
            socketId: socket.id
        });
        
        socket.join(userData.connectionId);
        console.log(`User ${userData.username} (${userData.connectionId}) connected`);
        
        socket.broadcast.emit('user-connected', userData);
    }

    handleConnectToUser(socket, data) {
        const { myId, targetId, myUsername } = data;
        
        const targetUser = connectedUsers.get(targetId);
        
        if (!targetUser) {
            socket.emit('connect-error', { message: 'User not found' });
            return;
        }

        const chatId = this.generateChatId(myId, targetId);
        
        if (!chatRooms.has(chatId)) {
            chatRooms.set(chatId, {
                id: chatId,
                participants: [myId, targetId],
                messages: []
            });
        }

        socket.join(chatId);
        
        const targetSocket = io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
            targetSocket.join(chatId);
        }

        socket.emit('connect-success', {
            targetUser: {
                username: targetUser.username,
                connectionId: targetUser.connectionId
            },
            chatId: chatId
        });

        if (targetSocket) {
            targetSocket.emit('connect-success', {
                targetUser: {
                    username: myUsername,
                    connectionId: myId
                },
                chatId: chatId
            });
        }

        console.log(`Connected users ${myId} and ${targetId} in chat ${chatId}`);
    }

    handleChatMessage(socket, messageData) {
        const { chatId } = messageData;
        
        if (!chatRooms.has(chatId)) {
            console.error(`Chat room ${chatId} not found`);
            return;
        }

        const chatRoom = chatRooms.get(chatId);
        chatRoom.messages.push(messageData);
        
        socket.to(chatId).emit('chat-message', messageData);
        
        console.log(`Message sent in chat ${chatId}: ${messageData.text}`);
    }

    handleDisconnection(socket) {
        if (socket.userData) {
            connectedUsers.delete(socket.userData.connectionId);
            console.log(`User ${socket.userData.username} disconnected`);
        }
    }

    generateChatId(userId1, userId2) {
        return [userId1, userId2].sort().join('-');
    }
}

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        connectedUsers: connectedUsers.size,
        chatRooms: chatRooms.size 
    });
});

app.get('/api/users', (req, res) => {
    const users = Array.from(connectedUsers.values()).map(user => ({
        username: user.username,
        connectionId: user.connectionId
    }));
    res.json(users);
});

app.post('/api/connect', (req, res) => {
    const { myConnectionID, targetConnectionID } = req.body;
    
    const targetUser = connectedUsers.get(targetConnectionID);
    
    if (!targetUser) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    const chatId = [myConnectionID, targetConnectionID].sort().join('-');
    
    if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, {
            id: chatId,
            participants: [myConnectionID, targetConnectionID],
            messages: []
        });
    }
    
    res.json({ 
        chat: { id: chatId }, 
        contact: { 
            username: targetUser.username, 
            connectionId: targetUser.connectionId 
        } 
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const chatServer = new ChatServer();

server.listen(PORT, () => {
    console.log(`Firebase Chats server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to use the application`);
});

module.exports = app;