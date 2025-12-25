// Awful Answers Game Logic
const { blackCards, whiteCards } = require('./cards');

class AwfulAnswersGame {
    constructor(roomCode, hostSocketId, hostName, maxPlayers = 10) {
        this.roomCode = roomCode;
        this.hostSocketId = hostSocketId;
        this.maxPlayers = maxPlayers;
        this.players = [];
        this.gameStarted = false;
        this.currentCardCzarIndex = 0;
        this.currentBlackCard = null;
        this.submittedAnswers = new Map(); // socketId -> white card(s)
        this.roundWinner = null;
        this.scores = new Map(); // socketId -> score
        this.password = null;

        // Decks
        this.blackDeck = this.shuffleArray([...blackCards]);
        this.whiteDeck = this.shuffleArray([...whiteCards]);
        this.blackDiscard = [];
        this.whiteDiscard = [];

        // Add host player
        this.addPlayer(hostSocketId, hostName);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    addPlayer(socketId, playerName) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, message: 'Game is full' };
        }

        if (this.players.find(p => p.socketId === socketId)) {
            return { success: false, message: 'Already in game' };
        }

        const player = {
            socketId,
            name: playerName,
            hand: [],
            score: 0
        };

        this.players.push(player);
        this.scores.set(socketId, 0);

        // Deal initial hand if game started
        if (this.gameStarted) {
            this.dealCardsToPlayer(player, 10);
        }

        return { success: true };
    }

    removePlayer(socketId) {
        const index = this.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            // Return cards to deck
            const player = this.players[index];
            this.whiteDiscard.push(...player.hand);

            this.players.splice(index, 1);
            this.scores.delete(socketId);

            // If Card Czar left, move to next round
            if (this.gameStarted && index === this.currentCardCzarIndex) {
                this.nextRound();
            }
        }

        // End game if not enough players
        if (this.players.length < 3) {
            this.gameStarted = false;
        }

        return { success: true };
    }

    startGame() {
        if (this.players.length < 4) {
            return { success: false, message: 'Need at least 4 players' };
        }

        this.gameStarted = true;

        // Deal cards to all players
        this.players.forEach(player => {
            this.dealCardsToPlayer(player, 10);
        });

        // Start first round
        this.nextRound();

        return { success: true };
    }

    dealCardsToPlayer(player, count) {
        for (let i = 0; i < count; i++) {
            if (this.whiteDeck.length === 0) {
                this.reshuffleWhiteDeck();
            }
            if (this.whiteDeck.length > 0) {
                player.hand.push(this.whiteDeck.pop());
            }
        }
    }

    reshuffleWhiteDeck() {
        this.whiteDeck = this.shuffleArray(this.whiteDiscard);
        this.whiteDiscard = [];
    }

    nextRound() {
        // Clear submitted answers
        this.submittedAnswers.clear();
        this.roundWinner = null;

        // Move to next Card Czar
        this.currentCardCzarIndex = (this.currentCardCzarIndex + 1) % this.players.length;

        // Draw new black card
        if (this.blackDeck.length === 0) {
            this.blackDeck = this.shuffleArray(this.blackDiscard);
            this.blackDiscard = [];
        }

        if (this.blackDeck.length > 0) {
            this.currentBlackCard = this.blackDeck.pop();
        }
    }

    submitAnswer(socketId, cardIndexes) {
        // Can't submit if you're the Card Czar
        if (this.getCardCzar().socketId === socketId) {
            return { success: false, message: 'Card Czar cannot submit answers' };
        }

        // Check if already submitted
        if (this.submittedAnswers.has(socketId)) {
            return { success: false, message: 'Already submitted' };
        }

        const player = this.getPlayerBySocketId(socketId);
        if (!player) {
            return { success: false, message: 'Player not found' };
        }

        // Get pick count (default 1)
        const pickCount = typeof this.currentBlackCard === 'object'
            ? (this.currentBlackCard.pick || 1)
            : 1;

        if (cardIndexes.length !== pickCount) {
            return { success: false, message: `Must select exactly ${pickCount} card(s)` };
        }

        // Extract cards from hand
        const cards = [];
        const sortedIndexes = [...cardIndexes].sort((a, b) => b - a); // Remove from end first

        for (const index of sortedIndexes) {
            if (index < 0 || index >= player.hand.length) {
                return { success: false, message: 'Invalid card index' };
            }
            cards.unshift(player.hand.splice(index, 1)[0]);
        }

        this.submittedAnswers.set(socketId, cards);

        // Deal new cards
        this.dealCardsToPlayer(player, pickCount);

        return { success: true };
    }

    selectWinner(winnerSocketId) {
        const cardCzar = this.getCardCzar();

        if (!this.submittedAnswers.has(winnerSocketId)) {
            return { success: false, message: 'Invalid winner' };
        }

        // Award point
        const score = this.scores.get(winnerSocketId) || 0;
        this.scores.set(winnerSocketId, score + 1);

        const winner = this.getPlayerBySocketId(winnerSocketId);
        winner.score = score + 1;

        this.roundWinner = winnerSocketId;

        // Discard played cards
        this.submittedAnswers.forEach(cards => {
            this.whiteDiscard.push(...cards);
        });

        if (typeof this.currentBlackCard === 'object') {
            this.blackDiscard.push(this.currentBlackCard.text);
        } else {
            this.blackDiscard.push(this.currentBlackCard);
        }

        return { success: true, winner };
    }

    getCardCzar() {
        return this.players[this.currentCardCzarIndex];
    }

    getPlayerBySocketId(socketId) {
        return this.players.find(p => p.socketId === socketId);
    }

    getAllSubmitted() {
        const allPlayers = this.players.filter(p => p.socketId !== this.getCardCzar().socketId);
        return allPlayers.length === this.submittedAnswers.size;
    }

    getGameState(forSocketId) {
        const player = this.getPlayerBySocketId(forSocketId);
        const cardCzar = this.getCardCzar();

        return {
            roomCode: this.roomCode,
            maxPlayers: this.maxPlayers,
            players: this.players.map(p => ({
                name: p.name,
                socketId: p.socketId,
                score: p.score,
                isCardCzar: p.socketId === cardCzar.socketId,
                hasSubmitted: this.submittedAnswers.has(p.socketId)
            })),
            gameStarted: this.gameStarted,
            playerHand: player ? player.hand : [],
            currentBlackCard: this.currentBlackCard,
            cardCzarName: cardCzar.name,
            isCardCzar: player && player.socketId === cardCzar.socketId,
            submittedCount: this.submittedAnswers.size,
            totalPlayers: this.players.length - 1, // Exclude Card Czar
            allSubmitted: this.getAllSubmitted(),
            roundWinner: this.roundWinner,
            scores: Object.fromEntries(this.scores)
        };
    }

    getSubmittedAnswersForCzar() {
        // Shuffle submitted answers for anonymity
        const answers = Array.from(this.submittedAnswers.entries());
        const shuffled = this.shuffleArray(answers);

        return shuffled.map(([socketId, cards]) => ({
            id: socketId,
            cards: cards
        }));
    }
}

module.exports = AwfulAnswersGame;
