// Awful Answers Server
const AwfulAnswersGame = require('./game');

// Store active games
const games = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function setupAwfulAnswersHandlers(io, socket) {
    // Create Game
    socket.on('createAwfulGame', ({ playerName, maxPlayers, password }) => {
        let roomCode;
        do {
            roomCode = generateRoomCode();
        } while (games.has(roomCode));

        const game = new AwfulAnswersGame(roomCode, socket.id, playerName, maxPlayers);
        if (password) {
            game.password = password;
        }

        games.set(roomCode, game);
        socket.join(roomCode);

        socket.emit('gameCreated', {
            roomCode,
            gameState: game.getGameState(socket.id)
        });

        console.log(`Awful Answers game created: ${roomCode} by ${playerName}`);
    });

    // Join Game
    socket.on('joinAwfulGame', ({ roomCode, playerName, password }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        if (game.password && game.password !== password) {
            socket.emit('error', { message: 'Incorrect password' });
            return;
        }

        if (game.gameStarted) {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        const result = game.addPlayer(socket.id, playerName);

        if (result.success) {
            socket.join(roomCode);
            io.to(roomCode).emit('gameState', {
                ...game.getGameState(socket.id),
                newPlayer: playerName
            });

            console.log(`${playerName} joined Awful Answers game: ${roomCode}`);
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    // Start Game
    socket.on('startAwfulGame', ({ roomCode }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        if (socket.id !== game.hostSocketId) {
            socket.emit('error', { message: 'Only host can start game' });
            return;
        }

        const result = game.startGame();

        if (result.success) {
            // Send game state to all players
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameStarted', game.getGameState(player.socketId));
            });

            console.log(`Awful Answers game started: ${roomCode}`);
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    // Submit Answer
    socket.on('submitAnswer', ({ roomCode, cardIndexes }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        const result = game.submitAnswer(socket.id, cardIndexes);

        if (result.success) {
            // Update all players
            game.players.forEach(player => {
                io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
            });

            // If all submitted, send answers to Card Czar
            if (game.getAllSubmitted()) {
                const cardCzar = game.getCardCzar();
                io.to(cardCzar.socketId).emit('showAnswers', {
                    answers: game.getSubmittedAnswersForCzar()
                });
            }
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    // Select Winner
    socket.on('selectWinner', ({ roomCode, winnerSocketId }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        const cardCzar = game.getCardCzar();
        if (socket.id !== cardCzar.socketId) {
            socket.emit('error', { message: 'Only Card Czar can select winner' });
            return;
        }

        const result = game.selectWinner(winnerSocketId);

        if (result.success) {
            // Announce winner
            io.to(roomCode).emit('roundWinner', {
                winner: result.winner,
                gameState: game.getGameState(socket.id)
            });

            // Check for game winner (first to 7 points)
            if (result.winner.score >= 7) {
                io.to(roomCode).emit('gameOver', {
                    winner: result.winner.name
                });

                // Clean up game after 10 seconds
                setTimeout(() => {
                    games.delete(roomCode);
                }, 10000);
            }
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    // Next Round
    socket.on('nextRound', ({ roomCode }) => {
        const game = games.get(roomCode);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        game.nextRound();

        // Update all players
        game.players.forEach(player => {
            io.to(player.socketId).emit('gameState', game.getGameState(player.socketId));
        });
    });

    // Leave Game
    socket.on('leaveAwfulGame', ({ roomCode }) => {
        const game = games.get(roomCode);
        if (game) {
            const player = game.getPlayerBySocketId(socket.id);
            const playerName = player ? player.name : 'Unknown';

            game.removePlayer(socket.id);
            socket.leave(roomCode);

            if (game.players.length === 0) {
                games.delete(roomCode);
                console.log(`Awful Answers game ended: ${roomCode}`);
            } else {
                io.to(roomCode).emit('playerLeft', {
                    playerName,
                    gameState: game.getGameState(game.players[0].socketId)
                });
            }
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        games.forEach((game, roomCode) => {
            const player = game.getPlayerBySocketId(socket.id);
            if (player) {
                const playerName = player.name;
                game.removePlayer(socket.id);

                if (game.players.length === 0) {
                    games.delete(roomCode);
                    console.log(`Awful Answers game ended: ${roomCode}`);
                } else {
                    io.to(roomCode).emit('playerLeft', {
                        playerName,
                        gameState: game.getGameState(game.players[0].socketId)
                    });
                }
            }
        });
    });
}

module.exports = { setupAwfulAnswersHandlers };
