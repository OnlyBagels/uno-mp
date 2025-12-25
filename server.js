// Main server for Party Games Hub
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const auth = require('./shared/auth');
const { setupAwfulAnswersHandlers } = require('./awful-answers/server');
const { generateGuestName } = require('./shared/guestNames');
const leaderboard = require('./shared/leaderboard');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'party-games-hub-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Discord OAuth2 Strategy
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
        scope: ['identify']
    },
    (accessToken, refreshToken, profile, done) => {
        // Save Discord user
        const discordUser = {
            username: profile.username,
            discordId: profile.id,
            avatar: profile.avatar,
            isGuest: false,
            isAdmin: false,
            isMod: false,
            isDiscord: true
        };
        return done(null, discordUser);
    }));
    console.log('✅ Discord OAuth2 enabled');
} else {
    console.log('⚠️  Discord OAuth2 disabled (set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET)');
}

// Google OAuth2 Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
    },
    (accessToken, refreshToken, profile, done) => {
        // Save Google user
        const googleUser = {
            username: profile.displayName || profile.emails[0].value.split('@')[0],
            googleId: profile.id,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value,
            isGuest: false,
            isAdmin: false,
            isMod: false,
            isGoogle: true
        };
        return done(null, googleUser);
    }));
    console.log('✅ Google OAuth2 enabled');
} else {
    console.log('⚠️  Google OAuth2 disabled (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)');
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/wildcard', express.static(path.join(__dirname, 'wildcard')));
app.use('/awful-answers', express.static(path.join(__dirname, 'awful-answers')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// Discord OAuth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication, redirect to game selection
        res.redirect('/?oauth=success');
    }
);

// Google OAuth routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication, redirect to game selection
        res.redirect('/?oauth=success');
    }
);

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

app.get('/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ user: req.user });
    } else {
        res.json({ user: null });
    }
});

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

app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

// Leaderboard API endpoints
app.get('/api/leaderboard/:gameType?', (req, res) => {
    const gameType = req.params.gameType || 'total';
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const data = leaderboard.getLeaderboard(gameType, limit, offset);
    res.json(data);
});

app.get('/api/leaderboard/search/:searchTerm', (req, res) => {
    const searchTerm = req.params.searchTerm;
    const gameType = req.query.gameType || 'total';
    const limit = parseInt(req.query.limit) || 50;

    const data = leaderboard.searchPlayers(searchTerm, gameType, limit);
    res.json(data);
});

app.get('/api/stats/:username', (req, res) => {
    const username = req.params.username;
    const stats = leaderboard.getPlayerStats(username);

    if (stats) {
        const totalRank = leaderboard.getPlayerRank(username, 'total');
        const wildcardRank = leaderboard.getPlayerRank(username, 'wildcard');
        const awfulAnswersRank = leaderboard.getPlayerRank(username, 'awful_answers');

        res.json({
            ...stats,
            ranks: {
                total: totalRank,
                wildcard: wildcardRank,
                awful_answers: awfulAnswersRank
            }
        });
    } else {
        res.status(404).json({ error: 'Player not found' });
    }
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

    socket.on('guestLogin', () => {
        // Generate random guest name
        const guestName = generateGuestName();

        socket.emit('loginResult', {
            success: true,
            user: {
                username: guestName,
                isGuest: true,
                isAdmin: false,
                isMod: false
            }
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
