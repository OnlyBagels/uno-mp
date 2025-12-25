// UNO Card Game - Multiplayer for 2-10 Human Players

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

        // Add number and action cards (0 appears once, others twice per color)
        colors.forEach(color => {
            this.cards.push(new Card(color, '0'));
            values.slice(1).forEach(value => {
                this.cards.push(new Card(color, value));
                this.cards.push(new Card(color, value));
            });
        });

        // Add Wild cards (4 of each)
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
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.hand = [];
        this.calledUno = false;
    }

    addCard(card) {
        this.hand.push(card);
        this.calledUno = false;
    }

    removeCard(card) {
        const index = this.hand.indexOf(card);
        if (index > -1) {
            this.hand.splice(index, 1);
        }
    }

    hasPlayableCard(topCard) {
        return this.hand.some(card => card.canPlayOn(topCard));
    }

    getPlayableCards(topCard) {
        return this.hand.filter(card => card.canPlayOn(topCard));
    }
}

class UnoGame {
    constructor() {
        this.deck = null;
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
        this.discardPile = [];
        this.gameStarted = false;
        this.waitingForColorChoice = false;
        this.pendingCard = null;
    }

    startGame(numPlayers) {
        this.deck = new Deck();
        this.players = [];
        this.currentPlayerIndex = 0;
        this.direction = 1;
        this.discardPile = [];
        this.gameStarted = true;
        this.waitingForColorChoice = false;

        // Create players
        for (let i = 0; i < numPlayers; i++) {
            this.players.push(new Player(i, `Player ${i + 1}`));
        }

        // Deal 7 cards to each player
        this.players.forEach(player => {
            for (let i = 0; i < 7; i++) {
                player.addCard(this.deck.draw());
            }
        });

        // Place first card (ensure it's not a Wild card)
        let firstCard;
        do {
            firstCard = this.deck.draw();
        } while (firstCard.color === 'wild');

        this.discardPile.push(firstCard);

        // Handle special first card
        if (firstCard.isSpecial()) {
            this.handleSpecialCard(firstCard);
        }
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

    playCard(player, card, chosenColor = null) {
        if (!this.canPlayCard(player, card)) {
            return false;
        }

        // Handle Wild cards
        if (card.color === 'wild') {
            if (!chosenColor) {
                this.waitingForColorChoice = true;
                this.pendingCard = card;
                return 'choose_color';
            }
            // Set the chosen color for the wild card
            card.color = chosenColor;
        }

        player.removeCard(card);
        this.discardPile.push(card);
        this.waitingForColorChoice = false;
        this.pendingCard = null;

        // Check for win
        if (player.hand.length === 0) {
            this.gameStarted = false;
            return 'win';
        }

        // Handle special cards
        if (card.isSpecial()) {
            this.handleSpecialCard(card);
        } else {
            this.nextTurn();
        }

        return true;
    }

    canPlayCard(player, card) {
        if (player !== this.getCurrentPlayer()) {
            return false;
        }
        return card.canPlayOn(this.getTopCard());
    }

    handleSpecialCard(card) {
        const topCard = this.getTopCard();

        switch (card.value) {
            case 'Skip':
                this.nextTurn();
                this.nextTurn();
                break;

            case 'Reverse':
                this.direction *= -1;
                // In a 2-player game, Reverse acts like Skip
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

        // Reshuffle if deck is empty
        if (this.deck.isEmpty() && this.discardPile.length > 1) {
            const topCard = this.discardPile.pop();
            this.deck.addCards(this.discardPile);
            this.discardPile = [topCard];
        }
    }

    drawCard(player) {
        if (player !== this.getCurrentPlayer()) {
            return false;
        }

        if (this.deck.isEmpty()) {
            if (this.discardPile.length > 1) {
                const topCard = this.discardPile.pop();
                this.deck.addCards(this.discardPile);
                this.discardPile = [topCard];
            } else {
                return false;
            }
        }

        const drawnCard = this.deck.draw();
        player.addCard(drawnCard);

        // Auto-play if the drawn card can be played
        if (drawnCard.canPlayOn(this.getTopCard())) {
            return { card: drawnCard, canPlay: true };
        } else {
            this.nextTurn();
            return { card: drawnCard, canPlay: false };
        }
    }

    callUno(player) {
        if (player.hand.length === 2) {
            player.calledUno = true;
            return true;
        }
        return false;
    }

    checkUnoPenalty(player) {
        if (player.hand.length === 1 && !player.calledUno) {
            // Penalty: draw 2 cards
            player.addCard(this.deck.draw());
            player.addCard(this.deck.draw());
            return true;
        }
        return false;
    }
}

// UI Controller
const game = new UnoGame();
let selectedCard = null;

// DOM Elements
const startBtn = document.getElementById('startBtn');
const numPlayersSelect = document.getElementById('numPlayers');
const playerHand = document.getElementById('playerHand');
const discardPile = document.getElementById('discardPile');
const drawPile = document.getElementById('drawPile');
const drawCardBtn = document.getElementById('drawCardBtn');
const unoBtn = document.getElementById('unoBtn');
const currentPlayerName = document.getElementById('currentPlayerName');
const directionArrow = document.getElementById('directionArrow');
const gameMessage = document.getElementById('gameMessage');
const deckCount = document.getElementById('deckCount');
const opponentsArea = document.getElementById('opponentsArea');
const colorChooser = document.getElementById('colorChooser');

// Event Listeners
startBtn.addEventListener('click', initGame);
drawCardBtn.addEventListener('click', handleDrawCard);
unoBtn.addEventListener('click', handleUnoCall);

// Color chooser buttons
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        handleColorChoice(color);
    });
});

function initGame() {
    const numPlayers = parseInt(numPlayersSelect.value);
    game.startGame(numPlayers);
    renderGame();
    updateMessage(`Game started! ${game.getCurrentPlayer().name}'s turn.`);
}

function renderGame() {
    if (!game.gameStarted) return;

    renderPlayerHand();
    renderDiscardPile();
    renderOpponents();
    updateGameInfo();
    updateDeckCount();
}

function renderPlayerHand() {
    const currentPlayer = game.getCurrentPlayer();
    playerHand.innerHTML = '';

    currentPlayer.hand.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        cardElement.addEventListener('click', () => handleCardClick(card));
        playerHand.appendChild(cardElement);
    });
}

function renderDiscardPile() {
    const topCard = game.getTopCard();
    discardPile.innerHTML = '';

    if (topCard) {
        const cardElement = createCardElement(topCard);
        discardPile.appendChild(cardElement);
    }
}

function renderOpponents() {
    opponentsArea.innerHTML = '';

    game.players.forEach((player, index) => {
        if (index !== game.currentPlayerIndex) {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent';
            opponentDiv.innerHTML = `
                <div class="opponent-name">${player.name}</div>
                <div class="opponent-cards">
                    ${player.hand.map(() => '<div class="card card-back-small"></div>').join('')}
                </div>
                <div class="opponent-card-count">${player.hand.length} cards</div>
            `;
            opponentsArea.appendChild(opponentDiv);
        }
    });
}

function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    const displayColor = card.color === 'wild' ? 'black' : card.color;
    cardDiv.className = `card card-${displayColor}`;

    if (card.color === 'wild') {
        cardDiv.classList.add('card-wild');
    }

    cardDiv.innerHTML = `<span class="card-value">${card.value}</span>`;

    return cardDiv;
}

function handleCardClick(card) {
    if (game.waitingForColorChoice) {
        updateMessage('Please choose a color first!');
        return;
    }

    const currentPlayer = game.getCurrentPlayer();
    const result = game.playCard(currentPlayer, card);

    if (result === 'choose_color') {
        selectedCard = card;
        colorChooser.classList.remove('hidden');
        updateMessage('Choose a color for your Wild card!');
    } else if (result === 'win') {
        updateMessage(`${currentPlayer.name} wins! 🎉`);
        renderGame();
    } else if (result) {
        selectedCard = null;
        updateMessage(`${currentPlayer.name} played ${card.value}!`);
        renderGame();

        // Check if next player forgot to call UNO
        setTimeout(() => {
            const nextPlayer = game.getCurrentPlayer();
            if (game.checkUnoPenalty(nextPlayer)) {
                updateMessage(`${nextPlayer.name} forgot to call UNO! Drew 2 cards as penalty.`);
                renderGame();
            }
        }, 1000);
    } else {
        updateMessage("You can't play that card!");
    }
}

function handleColorChoice(color) {
    if (!game.waitingForColorChoice || !selectedCard) return;

    const currentPlayer = game.getCurrentPlayer();
    const cardToPlay = game.pendingCard || selectedCard;

    const result = game.playCard(currentPlayer, cardToPlay, color);

    colorChooser.classList.add('hidden');

    if (result === 'win') {
        updateMessage(`${currentPlayer.name} wins! 🎉`);
    } else if (result) {
        updateMessage(`${currentPlayer.name} played ${cardToPlay.value} and chose ${color}!`);
    }

    selectedCard = null;
    renderGame();
}

function handleDrawCard() {
    if (game.waitingForColorChoice) {
        updateMessage('Please choose a color first!');
        return;
    }

    const currentPlayer = game.getCurrentPlayer();
    const result = game.drawCard(currentPlayer);

    if (result) {
        if (result.canPlay) {
            updateMessage(`Drew ${result.card.value}. You can play it or pass.`);
        } else {
            updateMessage(`Drew a card. Turn passed to next player.`);
        }
        renderGame();
    } else {
        updateMessage('No cards left to draw!');
    }
}

function handleUnoCall() {
    const currentPlayer = game.getCurrentPlayer();
    if (game.callUno(currentPlayer)) {
        updateMessage(`${currentPlayer.name} called UNO!`);
        unoBtn.classList.add('btn-uno-active');
        setTimeout(() => {
            unoBtn.classList.remove('btn-uno-active');
        }, 1000);
    } else {
        updateMessage('You can only call UNO when you have 2 cards!');
    }
}

function updateGameInfo() {
    const currentPlayer = game.getCurrentPlayer();
    currentPlayerName.textContent = currentPlayer.name;
    directionArrow.textContent = game.direction === 1 ? '→' : '←';
}

function updateDeckCount() {
    deckCount.textContent = game.deck.cards.length;
}

function updateMessage(message) {
    gameMessage.textContent = message;
}
