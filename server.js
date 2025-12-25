// Main server for Party Games Hub
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const auth = require('./shared/auth');
const { setupAwfulAnswersHandlers } = require('./awful-answers/server');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/wildcard', express.static(path.join(__dirname, 'wildcard')));
app.use('/awful-answers', express.static(path.join(__dirname, 'awful-answers')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/wildcard', (req, res) => {
    res.sendFile(path.join(__dirname, 'wildcard', 'index.html'));
});

app.get('/awful-answers', (req, res) => {
    res.sendFile(path.join(__dirname, 'awful-answers', 'index.html'));
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Authentication events
    socket.on('login', ({ username, password }) => {
        const result = auth.login(username, password);
        if (result.success) {
            socket.emit('loginResult', {
                success: true,
                user: result.user
            });
        } else {
            socket.emit('loginResult', {
                success: false,
                message: result.message
            });
        }
    });

    socket.on('register', ({ username, password }) => {
        const result = auth.register(username, password);
        socket.emit('registerResult', {
            success: result.success,
            message: result.message
        });
    });

    socket.on('guestLogin', ({ username }) => {
        socket.emit('loginResult', {
            success: true,
            user: { username, isGuest: true, isAdmin: false, isMod: false }
        });
    });

    // Game routing
    socket.on('joinGame', ({ gameType }) => {
        if (gameType === 'wildcard') {
            // Forward to WildCard game namespace
            socket.emit('redirectTo', '/wildcard');
        } else if (gameType === 'awful-answers') {
            // Forward to Awful Answers game namespace
            socket.emit('redirectTo', '/awful-answers');
        }
    });

    // Setup game handlers
    setupAwfulAnswersHandlers(io, socket);

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🎮 Party Games Hub running on port ${PORT}`);
    console.log(`🃏 WildCard available at http://localhost:${PORT}/wildcard`);
    console.log(`😈 Awful Answers available at http://localhost:${PORT}/awful-answers`);
});
