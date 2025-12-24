const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Game state storage
const games = new Map();

// Admin system
let adminConfig = {
    admins: {},
    registeredUsers: {}
};

// Load admin config
try {
    const configData = fs.readFileSync(path.join(__dirname, 'admin-config.json'), 'utf8');
    adminConfig = JSON.parse(configData);
} catch (err) {
    console.log('No admin config found, using defaults');
}

// Save admin config
function saveAdminConfig() {
    fs.writeFileSync(
        path.join(__dirname, 'admin-config.json'),
        JSON.stringify(adminConfig, null, 2)
    );
}

// Check if user is admin
function isAdmin(ip, userId) {
    return adminConfig.admins[ip] ||
           (adminConfig.registeredUsers[userId] && adminConfig.registeredUsers[userId].isAdmin);
}

// Get admin permissions
function getAdminPermissions(ip, userId) {
    if (adminConfig.admins[ip]) {
        return adminConfig.admins[ip].permissions || [];
    }
    if (adminConfig.registeredUsers[userId] && adminConfig.registeredUsers[userId].isAdmin) {
        return adminConfig.registeredUsers[userId].permissions || [];
    }
    return [];
}

// Card and Game classes (server-side)
class Card {
    constructor(color, value) {
        this.color = color;
        this.value = value;
    }

    canPlayOn(topCard) {
        return this.color === topCard.color ||
               this.value === topCard.value ||
               this.color === 'wild' ||
               topCard.color === 'wild';
    }

    isSpecial() {
        return ['Skip', 'Reverse', 'Draw Two', 'Wild', 'Wild Draw Four'].includes(this.value);
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }

    initializeDeck() {
        const colors = ['red', 'blue', 'green', 'yellow'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];

        colors.forEach(color => {
            this.cards.push(new Card(color, '0'));
            values.slice(1).forEach(value => {
                this.cards.push(new Card(color, value));
                this.cards.push(new Card(color, value));
            });
        });

        for (let i = 0; i < 4; i++) {
            this.cards.push(new Card('wild', 'Wild'));
            this.cards.push(new Card('wild', 'Wild Draw Four'));
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw() {
        return this.cards.pop();
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    addCards(cards) {
        this.cards.push(...cards);
        this.shuffle();
    }
}

class Player {
    constructor(id, name, socketId) {
        this.id = id;
        this.name = name;
        this.socketId = socketId;
        this.hand = [];
        this.calledUno = false;
    }

    addCard(card) {
        this.hand.push(card);
        this.calledUno = false;
    }

    removeCard(cardIndex) {
        if (cardIndex >= 0 && cardIndex < this.hand.length) {
            this.hand.splice(cardIndex, 1);
        }
    }

    hasPlayableCard(topCard) {
        return this.hand.some(card => card.canPlayOn(topCard));
    }
}

class UnoGame {
    constructor(roomCode, maxPlayers) {
        this.roomCode = roomCode;
        this.maxPlayers = maxPlayers;
        this.deck = null;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.discardPile = [];
        this.gameStarted = false;
        this.waitingForColorChoice = false;
        this.pendingCard = null;
    }

    addPlayer(socketId, name) {
        if (this.players.length >= this.maxPlayers) {
            return false;
        }
        const player = new Player(this.players.length, name, socketId);
        this.players.push(player);
        return true;
    }

    removePlayer(socketId) {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index > -1) {
            this.players.splice(index, 1);
            if (this.currentPlayerIndex >= this.players.length) {
                this.currentPlayerIndex = 0;
            }
            return true;
        }
        return false;
    }

    getPlayerBySocketId(socketId) {
        return this.players.find(p => p.socketId === socketId);
    }

    startGame() {
        if (this.players.length < 2) {
            return false;
        }

        this.deck = new Deck();
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.discardPile = [];
        this.gameStarted = true;
        this.waitingForColorChoice = false;

        this.players.forEach(player => {
            player.hand = [];
            player.calledUno = false;
            for (let i = 0; i < 7; i++) {
                player.addCard(this.deck.draw());
            }
        });

        let firstCard;
        do {
            firstCard = this.deck.draw();
        } while (firstCard.color === 'wild');

        this.discardPile.push(firstCard);

        if (firstCard.isSpecial()) {
            this.handleSpecialCard(firstCard);
        }

        return true;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getTopCard() {
        return this.discardPile[this.discardPile.length - 1];
    }

    nextTurn() {
        this.currentPlayerIndex = (this.currentPlayerIndex + this.direction + this.players.length) % this.players.length;
    }

    playCard(socketId, cardIndex, chosenColor = null) {
        const player = this.getPlayerBySocketId(socketId);
        if (!player || player !== this.getCurrentPlayer()) {
            return { success: false, error: 'Not your turn' };
        }

        if (cardIndex < 0 || cardIndex >= player.hand.length) {
            return { success: false, error: 'Invalid card' };
        }

        const card = player.hand[cardIndex];
        const topCard = this.getTopCard();

        if (!card.canPlayOn(topCard)) {
            return { success: false, error: 'Cannot play this card' };
        }

        if (card.color === 'wild') {
            if (!chosenColor) {
                this.waitingForColorChoice = true;
                this.pendingCard = { cardIndex, playerId: player.id };
                return { success: true, needsColor: true };
            }
            card.color = chosenColor;
        }

        player.removeCard(cardIndex);
        this.discardPile.push(card);
        this.waitingForColorChoice = false;
        this.pendingCard = null;

        if (player.hand.length === 0) {
            this.gameStarted = false;
            return { success: true, winner: player.name };
        }

        if (card.isSpecial()) {
            this.handleSpecialCard(card);
        } else {
            this.nextTurn();
        }

        return { success: true };
    }

    handleSpecialCard(card) {
        switch (card.value) {
            case 'Skip':
                this.nextTurn();
                this.nextTurn();
                break;

            case 'Reverse':
                this.direction *= -1;
                if (this.players.length === 2) {
                    this.nextTurn();
                }
                this.nextTurn();
                break;

            case 'Draw Two':
                this.nextTurn();
                const nextPlayer = this.getCurrentPlayer();
                nextPlayer.addCard(this.deck.draw());
                nextPlayer.addCard(this.deck.draw());
                this.nextTurn();
                break;

            case 'Wild Draw Four':
                this.nextTurn();
                const challengedPlayer = this.getCurrentPlayer();
                for (let i = 0; i < 4; i++) {
                    challengedPlayer.addCard(this.deck.draw());
                }
                this.nextTurn();
                break;

            case 'Wild':
                this.nextTurn();
                break;
        }

        if (this.deck.isEmpty() && this.discardPile.length > 1) {
            const topCard = this.discardPile.pop();
            this.deck.addCards(this.discardPile);
            this.discardPile = [topCard];
        }
    }

    drawCard(socketId) {
        const player = this.getPlayerBySocketId(socketId);
        if (!player || player !== this.getCurrentPlayer()) {
            return { success: false, error: 'Not your turn' };
        }

        if (this.deck.isEmpty()) {
            if (this.discardPile.length > 1) {
                const topCard = this.discardPile.pop();
                this.deck.addCards(this.discardPile);
                this.discardPile = [topCard];
            } else {
                return { success: false, error: 'No cards to draw' };
            }
        }

        const drawnCard = this.deck.draw();
        player.addCard(drawnCard);

        const canPlay = drawnCard.canPlayOn(this.getTopCard());
        if (!canPlay) {
            this.nextTurn();
        }

        return { success: true, card: drawnCard, canPlay };
    }

    callUno(socketId) {
        const player = this.getPlayerBySocketId(socketId);
        if (!player) {
            return false;
        }

        if (player.hand.length === 2) {
            player.calledUno = true;
            return true;
        }
        return false;
    }

    getGameState(forSocketId = null) {
        const player = this.getPlayerBySocketId(forSocketId);

        return {
            roomCode: this.roomCode,
            gameStarted: this.gameStarted,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length,
                isCurrentPlayer: this.gameStarted && p === this.getCurrentPlayer(),
                socketId: p.socketId
            })),
            currentPlayerIndex: this.currentPlayerIndex,
            direction: this.direction,
            topCard: this.discardPile.length > 0 ? this.getTopCard() : null,
            deckCount: this.deck ? this.deck.cards.length : 0,
            playerHand: player ? player.hand : [],
            waitingForColorChoice: this.waitingForColorChoice,
            maxPlayers: this.maxPlayers
        };
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    const clientIp = socket.handshake.address;
    const isUserAdmin = isAdmin(clientIp, null);
    const userPermissions = getAdminPermissions(clientIp, null);

    // Send admin status to client
    socket.emit('adminStatus', {
        isAdmin: isUserAdmin,
        permissions: userPermissions
    });

    socket.on('createGame', ({ playerName, maxPlayers }) => {
        const roomCode = generateRoomCode();
        const game = new UnoGame(roomCode, maxPlayers);
        game.addPlayer(socket.id, playerName);
        games.set(roomCode, game);

        socket.join(roomCode);
        socket.emit('gameCreated', { roomCode, gameState: game.getGameState(socket.id) });
        console.log(`Game created: ${roomCode} by ${playerName}`);
    });

    socket.on('joinGame', ({ roomCode, playerName }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        if (game.gameStarted) {
            socket.emit('error', { message: 'Game already started' });
            return;
        }

        if (!game.addPlayer(socket.id, playerName)) {
            socket.emit('error', { message: 'Game is full' });
            return;
        }

        socket.join(roomCode);
        socket.emit('gameJoined', { roomCode, gameState: game.getGameState(socket.id) });

        // Notify all players in the room
        io.to(roomCode).emit('playerJoined', {
            playerName,
            gameState: game.getGameState()
        });

        console.log(`${playerName} joined game: ${roomCode}`);
    });

    socket.on('startGame', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (!game) return;

        if (game.startGame()) {
            io.to(roomCode).emit('gameStarted', {
                message: 'Game started!',
                currentPlayer: game.getCurrentPlayer().name
            });

            // Send individual game states to each player
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
            });
        } else {
            socket.emit('error', { message: 'Need at least 2 players to start' });
        }
    });

    socket.on('playCard', ({ roomCode, cardIndex, chosenColor }) => {
        const game = games.get(roomCode);
        if (!game) return;

        const result = game.playCard(socket.id, cardIndex, chosenColor);

        if (result.success) {
            if (result.needsColor) {
                socket.emit('chooseColor', {});
            } else if (result.winner) {
                io.to(roomCode).emit('gameOver', { winner: result.winner });
                game.players.forEach(player => {
                    io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
                });
            } else {
                game.players.forEach(player => {
                    io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
                });
                io.to(roomCode).emit('cardPlayed', {
                    playerName: game.getPlayerBySocketId(socket.id).name,
                    currentPlayer: game.getCurrentPlayer().name
                });
            }
        } else {
            socket.emit('error', { message: result.error });
        }
    });

    socket.on('drawCard', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (!game) return;

        const result = game.drawCard(socket.id);

        if (result.success) {
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
            });

            socket.emit('cardDrawn', {
                card: result.card,
                canPlay: result.canPlay
            });

            if (!result.canPlay) {
                io.to(roomCode).emit('turnPassed', {
                    currentPlayer: game.getCurrentPlayer().name
                });
            }
        } else {
            socket.emit('error', { message: result.error });
        }
    });

    socket.on('callUno', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (!game) return;

        if (game.callUno(socket.id)) {
            const player = game.getPlayerBySocketId(socket.id);
            io.to(roomCode).emit('unoCalled', { playerName: player.name });
        }
    });

    // Admin Commands
    socket.on('adminKickPlayer', ({ roomCode, targetSocketId }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        const targetPlayer = game.getPlayerBySocketId(targetSocketId);
        if (targetPlayer) {
            game.removePlayer(targetSocketId);
            io.to(targetSocketId).emit('kicked', { message: 'You were kicked by an admin' });
            io.to(roomCode).emit('playerLeft', {
                playerName: targetPlayer.name + ' (Kicked)',
                gameState: game.getGameState()
            });
            console.log(`Admin kicked player: ${targetPlayer.name} from ${roomCode}`);
        }
    });

    socket.on('adminEndGame', ({ roomCode }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        game.gameStarted = false;
        io.to(roomCode).emit('gameOver', { winner: 'Admin ended the game' });
        console.log(`Admin ended game: ${roomCode}`);
    });

    socket.on('adminSkipTurn', ({ roomCode }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game || !game.gameStarted) return;

        const skippedPlayer = game.getCurrentPlayer();
        game.nextTurn();

        game.players.forEach(player => {
            io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
        });

        io.to(roomCode).emit('adminAction', {
            message: `Admin skipped ${skippedPlayer.name}'s turn`
        });
        console.log(`Admin skipped turn in ${roomCode}`);
    });

    socket.on('adminViewHands', ({ roomCode }) => {
        if (!isUserAdmin || !userPermissions.includes('view_hands')) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        const allHands = game.players.map(p => ({
            name: p.name,
            socketId: p.socketId,
            hand: p.hand,
            cardCount: p.hand.length
        }));

        socket.emit('adminHandsView', { players: allHands });
    });

    socket.on('adminForceStart', ({ roomCode }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        if (game.players.length < 2) {
            socket.emit('error', { message: 'Need at least 2 players' });
            return;
        }

        game.startGame();
        io.to(roomCode).emit('gameStarted', {
            message: 'Admin force-started the game!',
            currentPlayer: game.getCurrentPlayer().name
        });

        game.players.forEach(player => {
            io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
        });
        console.log(`Admin force-started game: ${roomCode}`);
    });

    socket.on('adminRegisterUser', ({ username, password, isAdmin: makeAdmin }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const userId = username.toLowerCase().replace(/\s+/g, '_');
        adminConfig.registeredUsers[userId] = {
            username: username,
            password: password, // In production, hash this!
            isAdmin: makeAdmin || false,
            permissions: makeAdmin ? ['kick', 'end_game', 'skip_turn', 'view_hands', 'force_start'] : []
        };

        saveAdminConfig();
        socket.emit('adminUserRegistered', {
            message: `User ${username} registered successfully`,
            userId: userId
        });
        console.log(`Admin registered new user: ${username} (Admin: ${makeAdmin})`);
    });

    socket.on('adminListUsers', () => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        socket.emit('adminUsersList', {
            admins: adminConfig.admins,
            users: adminConfig.registeredUsers
        });
    });

    socket.on('adminChangeColor', ({ roomCode, color }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game || !game.gameStarted) return;

        const topCard = game.getTopCard();
        if (topCard) {
            topCard.color = color;
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
            });
            io.to(roomCode).emit('adminAction', {
                message: `Admin changed color to ${color}`
            });
            console.log(`Admin changed color to ${color} in ${roomCode}`);
        }
    });

    socket.on('adminRedrawCards', ({ roomCode, targetSocketId, count }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        const targetPlayer = game.getPlayerBySocketId(targetSocketId);
        if (targetPlayer) {
            for (let i = 0; i < count; i++) {
                if (!game.deck.isEmpty()) {
                    targetPlayer.addCard(game.deck.draw());
                }
            }
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
            });
            io.to(roomCode).emit('adminAction', {
                message: `Admin made ${targetPlayer.name} draw ${count} cards`
            });
            console.log(`Admin made ${targetPlayer.name} draw ${count} cards in ${roomCode}`);
        }
    });

    socket.on('adminResetGame', ({ roomCode }) => {
        if (!isUserAdmin) {
            socket.emit('error', { message: 'Unauthorized: Admin only' });
            return;
        }

        const game = games.get(roomCode);
        if (!game) return;

        game.gameStarted = false;
        game.deck = null;
        game.discardPile = [];
        game.currentPlayerIndex = 0;
        game.direction = 1;
        game.players.forEach(p => {
            p.hand = [];
            p.calledUno = false;
        });

        io.to(roomCode).emit('gameReset', {
            message: 'Admin reset the game'
        });
        game.players.forEach(player => {
            io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
        });
        console.log(`Admin reset game: ${roomCode}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Find and remove player from any game
        for (const [roomCode, game] of games.entries()) {
            const player = game.getPlayerBySocketId(socket.id);
            if (player) {
                game.removePlayer(socket.id);
                io.to(roomCode).emit('playerLeft', {
                    playerName: player.name,
                    gameState: game.getGameState()
                });

                // Remove empty games
                if (game.players.length === 0) {
                    games.delete(roomCode);
                    console.log(`Game ${roomCode} deleted (empty)`);
                }
                break;
            }
        }
    });
});

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Players can connect at http://localhost:${PORT}`);
    console.log(`Or from other computers at http://YOUR_LOCAL_IP:${PORT}`);
});
