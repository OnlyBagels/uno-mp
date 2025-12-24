// Client-side Socket.io connection and game logic
const socket = io();

// Game state
let currentRoomCode = null;
let playerName = null;
let mySocketId = null;
let pendingColorChoice = false;
let pendingCardIndex = null;

// DOM Elements - Screens
const loginScreen = document.getElementById('loginScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');

// DOM Elements - Login
const playerNameInput = document.getElementById('playerNameInput');
const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const maxPlayersSelect = document.getElementById('maxPlayers');
const roomCodeInput = document.getElementById('roomCodeInput');

// DOM Elements - Lobby
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const lobbyPlayersList = document.getElementById('lobbyPlayersList');
const playerCount = document.getElementById('playerCount');
const startGameBtn = document.getElementById('startGameBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');

// DOM Elements - Game
const gameRoomCode = document.getElementById('gameRoomCode');
const playerHand = document.getElementById('playerHand');
const discardPile = document.getElementById('discardPile');
const drawCardBtn = document.getElementById('drawCardBtn');
const unoBtn = document.getElementById('unoBtn');
const currentPlayerName = document.getElementById('currentPlayerName');
const directionArrow = document.getElementById('directionArrow');
const gameMessage = document.getElementById('gameMessage');
const deckCount = document.getElementById('deckCount');
const opponentsArea = document.getElementById('opponentsArea');
const colorChooser = document.getElementById('colorChooser');
const leaveGameBtn = document.getElementById('leaveGameBtn');

// Event Listeners - Login
createGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    playerName = name;
    const maxPlayers = parseInt(maxPlayersSelect.value);
    socket.emit('createGame', { playerName: name, maxPlayers });
});

joinGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    if (!roomCode) {
        alert('Please enter a room code');
        return;
    }
    playerName = name;
    socket.emit('joinGame', { roomCode, playerName: name });
});

// Event Listeners - Lobby
startGameBtn.addEventListener('click', () => {
    socket.emit('startGame', { roomCode: currentRoomCode });
});

leaveLobbyBtn.addEventListener('click', () => {
    location.reload();
});

// Event Listeners - Game
drawCardBtn.addEventListener('click', () => {
    if (currentRoomCode) {
        socket.emit('drawCard', { roomCode: currentRoomCode });
    }
});

unoBtn.addEventListener('click', () => {
    if (currentRoomCode) {
        socket.emit('callUno', { roomCode: currentRoomCode });
    }
});

leaveGameBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the game?')) {
        location.reload();
    }
});

// Color chooser buttons
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        handleColorChoice(color);
    });
});

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    mySocketId = socket.id;
});

socket.on('gameCreated', ({ roomCode, gameState }) => {
    currentRoomCode = roomCode;
    showLobby(gameState);
    updateMessage(`Game created! Room code: ${roomCode}`);
});

socket.on('gameJoined', ({ roomCode, gameState }) => {
    currentRoomCode = roomCode;
    showLobby(gameState);
    updateMessage('Joined game successfully!');
});

socket.on('playerJoined', ({ playerName: newPlayerName, gameState }) => {
    updateLobby(gameState);
    updateMessage(`${newPlayerName} joined the game`);
});

socket.on('gameStarted', ({ message, currentPlayer }) => {
    showGame();
    updateMessage(`${message} ${currentPlayer}'s turn!`);
});

socket.on('gameState', (gameState) => {
    renderGame(gameState);
});

socket.on('chooseColor', () => {
    pendingColorChoice = true;
    colorChooser.classList.remove('hidden');
    updateMessage('Choose a color for your Wild card!');
});

socket.on('cardPlayed', ({ playerName: playedPlayerName, currentPlayer }) => {
    updateMessage(`${playedPlayerName} played a card. ${currentPlayer}'s turn!`);
});

socket.on('cardDrawn', ({ card, canPlay }) => {
    if (canPlay) {
        updateMessage(`You drew a ${card.value}. You can play it or pass.`);
    } else {
        updateMessage('Drew a card. Turn passed.');
    }
});

socket.on('turnPassed', ({ currentPlayer }) => {
    updateMessage(`Turn passed. ${currentPlayer}'s turn!`);
});

socket.on('unoCalled', ({ playerName: unoPlayerName }) => {
    updateMessage(`${unoPlayerName} called UNO!`);
    if (unoPlayerName === playerName) {
        unoBtn.classList.add('btn-uno-active');
        setTimeout(() => {
            unoBtn.classList.remove('btn-uno-active');
        }, 1000);
    }
});

socket.on('gameOver', ({ winner }) => {
    updateMessage(`🎉 ${winner} wins the game! 🎉`);
    setTimeout(() => {
        if (confirm('Game Over! Play again?')) {
            location.reload();
        }
    }, 3000);
});

socket.on('playerLeft', ({ playerName: leftPlayerName, gameState }) => {
    updateMessage(`${leftPlayerName} left the game`);
    if (gameState.gameStarted) {
        renderGame(gameState);
    } else {
        updateLobby(gameState);
    }
});

socket.on('error', ({ message }) => {
    alert(message);
});

// Screen management
function showLobby(gameState) {
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    roomCodeDisplay.textContent = currentRoomCode;
    updateLobby(gameState);
}

function showGame() {
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameRoomCode.textContent = currentRoomCode;
}

function updateLobby(gameState) {
    lobbyPlayersList.innerHTML = '';
    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'lobby-player';
        playerDiv.textContent = player.name;
        if (player.socketId === mySocketId) {
            playerDiv.classList.add('current-player-highlight');
            playerDiv.textContent += ' (You)';
        }
        lobbyPlayersList.appendChild(playerDiv);
    });
    playerCount.textContent = `${gameState.players.length}/${gameState.maxPlayers} players`;
}

// Game rendering
function renderGame(gameState) {
    if (!gameState) return;

    renderPlayerHand(gameState);
    renderDiscardPile(gameState);
    renderOpponents(gameState);
    updateGameInfo(gameState);
    updateDeckCount(gameState);
}

function renderPlayerHand(gameState) {
    playerHand.innerHTML = '';

    if (!gameState.playerHand || gameState.playerHand.length === 0) {
        playerHand.innerHTML = '<p style="text-align: center; color: #6b7280;">No cards</p>';
        return;
    }

    gameState.playerHand.forEach((card, index) => {
        const cardElement = createCardElement(card);
        cardElement.addEventListener('click', () => handleCardClick(index, card));
        playerHand.appendChild(cardElement);
    });
}

function renderDiscardPile(gameState) {
    discardPile.innerHTML = '';

    if (gameState.topCard) {
        const cardElement = createCardElement(gameState.topCard);
        discardPile.appendChild(cardElement);
    }
}

function renderOpponents(gameState) {
    opponentsArea.innerHTML = '';

    gameState.players.forEach(player => {
        if (player.socketId !== mySocketId) {
            const opponentDiv = document.createElement('div');
            opponentDiv.className = 'opponent';
            if (player.isCurrentPlayer) {
                opponentDiv.classList.add('current-turn');
            }
            opponentDiv.innerHTML = `
                <div class="opponent-name">${player.name}</div>
                <div class="opponent-cards">
                    ${Array(player.cardCount).fill('').map(() => '<div class="card card-back-small"></div>').join('')}
                </div>
                <div class="opponent-card-count">${player.cardCount} cards</div>
            `;
            opponentsArea.appendChild(opponentDiv);
        }
    });
}

function createCardElement(card) {
    const cardDiv = document.createElement('div');
    const displayColor = card.color === 'wild' ? 'black' : card.color;
    cardDiv.className = `card card-${displayColor}`;

    if (card.color === 'wild') {
        cardDiv.classList.add('card-wild');
    }

    cardDiv.innerHTML = `<span class="card-value">${card.value}</span>`;
    return cardDiv;
}

function handleCardClick(cardIndex, card) {
    if (pendingColorChoice) {
        updateMessage('Please choose a color first!');
        return;
    }

    pendingCardIndex = cardIndex;
    socket.emit('playCard', {
        roomCode: currentRoomCode,
        cardIndex: cardIndex
    });
}

function handleColorChoice(color) {
    if (!pendingColorChoice) return;

    socket.emit('playCard', {
        roomCode: currentRoomCode,
        cardIndex: pendingCardIndex,
        chosenColor: color
    });

    colorChooser.classList.add('hidden');
    pendingColorChoice = false;
    pendingCardIndex = null;
}

function updateGameInfo(gameState) {
    const currentPlayer = gameState.players.find(p => p.isCurrentPlayer);
    if (currentPlayer) {
        currentPlayerName.textContent = currentPlayer.name;
        if (currentPlayer.socketId === mySocketId) {
            currentPlayerName.textContent += ' (You)';
        }
    }
    directionArrow.textContent = gameState.direction === 1 ? '→' : '←';
}

function updateDeckCount(gameState) {
    deckCount.textContent = gameState.deckCount;
}

function updateMessage(message) {
    gameMessage.textContent = message;
}
