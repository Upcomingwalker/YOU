const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: true, methods: ["GET", "POST"], credentials: true } });
app.use(cors({ origin: true, methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY || '364c6c1f-2426-4f4b-a0f1-ff137b39b423';
const VIDEOSDK_SECRET = process.env.VIDEOSDK_SECRET || '2089ec181d92ac7c837285e56418ffd22591472458c15c61ac08724ed33b252d';
const activeMeetings = new Map();
const participants = new Map();

function generateMeetingId() {
    let mid;
    do { mid = Math.floor(100000 + Math.random() * 900000).toString(); }
    while (activeMeetings.has(mid));
    return mid;
}

function generateToken(meetingId, participantId) {
    return jwt.sign({
        apikey: VIDEOSDK_API_KEY,
        permissions: ['allow_join', 'allow_mod'],
        version: 2,
        meetingId, participantId,
        exp: Math.floor(Date.now() / 1000) + (4 * 60 * 60),
        iat: Math.floor(Date.now() / 1000)
    }, VIDEOSDK_SECRET, { algorithm: 'HS256' });
}

app.post('/api/create-meeting', (req, res) => {
    const { userName } = req.body;
    const meetingId = generateMeetingId();
    const participantId = crypto.randomBytes(16).toString('hex');
    activeMeetings.set(meetingId, [participantId]);
    participants.set(participantId, { meetingId });
    res.json({ success: true, meetingId, participantId, token: generateToken(meetingId, participantId) });
});

app.post('/api/join-meeting', (req, res) => {
    const { meetingId, userName } = req.body;
    if (!activeMeetings.has(meetingId)) return res.json({ success: false });
    const participantId = crypto.randomBytes(16).toString('hex');
    activeMeetings.get(meetingId).push(participantId);
    participants.set(participantId, { meetingId });
    res.json({ success: true, meetingId, participantId, token: generateToken(meetingId, participantId) });
});

io.on('connection', (socket) => {
    socket.on('join', ({ meetingId, userName }) => {
        if (!activeMeetings.has(meetingId)) return;
        socket.join(meetingId);
        const socketsInRoom = Array.from(io.sockets.adapter.rooms.get(meetingId) || []);
        const ownPid = Array.from(participants.entries()).find(e => e[1].meetingId === meetingId && !e[1].socketId)[0];
        participants.get(ownPid).socketId = socket.id;
        const his = Array.from(participants.entries()).filter(e => e[1].meetingId === meetingId && e[1].socketId && e[0] !== ownPid).map(e => e[0]);
        socket.emit('joined', { meetingId, participantId: ownPid, participants: his });
        socket.to(meetingId).emit('new-participant', ownPid);
    });
    socket.on('signal', (msg) => {
        const dest = Array.from(participants.entries()).find(e => e[0] === msg.to);
        if (!dest || !dest[1].socketId) return;
        io.to(dest[1].socketId).emit('signal', { from: Array.from(participants.entries()).find(e => e[1].socketId === socket.id)[0], data: msg.data });
    });
    socket.on('disconnect', () => {
        const pEntry = Array.from(participants.entries()).find(e => e[1].socketId === socket.id);
        if (!pEntry) return;
        const pid = pEntry[0];
        const mid = pEntry[1].meetingId;
        participants.delete(pid);
        if (activeMeetings.has(mid)) {
            activeMeetings.set(mid, activeMeetings.get(mid).filter(x => x !== pid));
            io.to(mid).emit('participant-left', pid);
            if (activeMeetings.get(mid).length === 0) activeMeetings.delete(mid);
        }
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0');
