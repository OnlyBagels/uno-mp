// Client-side Socket.io connection and game logic
const socket = io();

// Game state
let currentRoomCode = null;
let playerName = null;
let mySocketId = null;
let pendingColorChoice = false;
let pendingCardIndex = null;
let isAdmin = false;
let adminPermissions = [];

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

// Notification System
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-message">${message}</div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}

// Event Listeners - Login
createGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        showNotification('Please enter your name', 'warning');
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
        showNotification('Please enter your name', 'warning');
        return;
    }
    if (!roomCode) {
        showNotification('Please enter a room code', 'warning');
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

socket.on('adminStatus', ({ isAdmin: adminStatus, permissions }) => {
    isAdmin = adminStatus;
    adminPermissions = permissions;
    if (isAdmin) {
        console.log('Admin privileges detected');
        console.log('Permissions:', permissions);
    }
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
    showNotification(message, 'error');
});

// Admin event handlers
socket.on('kicked', ({ message }) => {
    showNotification(message, 'error', 5000);
    setTimeout(() => location.reload(), 5000);
});

socket.on('adminAction', ({ message }) => {
    showNotification(`⚡ ${message}`, 'admin');
    updateMessage(`⚡ ADMIN: ${message}`);
});

socket.on('adminHandsView', ({ players }) => {
    console.log('=== ADMIN: All Player Hands ===');
    players.forEach(p => {
        console.log(`${p.name}:`, p.hand);
    });
    showNotification(`Player hands logged to console (${players.length} players)`, 'admin');
});

socket.on('adminUserRegistered', ({ message }) => {
    showNotification(message, 'success');
});

socket.on('adminUsersList', ({ admins, users }) => {
    console.log('=== ADMIN: Users List ===');
    console.log('IP Admins:', admins);
    console.log('Registered Users:', users);
    showNotification('Users list logged to console', 'admin');
});

socket.on('gameReset', ({ message }) => {
    showNotification(message, 'warning');
    updateMessage('Game has been reset');
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

            let adminButtons = '';
            if (isAdmin && adminPermissions.includes('kick')) {
                adminButtons = `<button class="btn-admin-small btn-admin-kick" onclick="adminKick('${player.socketId}')">Kick</button>`;
            }

            opponentDiv.innerHTML = `
                <div class="opponent-name">${player.name} ${adminButtons}</div>
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

// Admin Functions (accessible globally for onclick handlers)
window.adminKick = function(targetSocketId) {
    if (!isAdmin) return;
    socket.emit('adminKickPlayer', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId
    });
};

window.adminEndGame = function() {
    if (!isAdmin) return;
    socket.emit('adminEndGame', { roomCode: currentRoomCode });
};

window.adminSkipTurn = function() {
    if (!isAdmin) return;
    socket.emit('adminSkipTurn', { roomCode: currentRoomCode });
};

window.adminViewHands = function() {
    if (!isAdmin || !adminPermissions.includes('view_hands')) {
        showNotification('No permission', 'error');
        return;
    }
    socket.emit('adminViewHands', { roomCode: currentRoomCode });
};

window.adminForceStart = function() {
    if (!isAdmin) return;
    socket.emit('adminForceStart', { roomCode: currentRoomCode });
};

window.adminChangeColor = function(color) {
    if (!isAdmin) return;
    socket.emit('adminChangeColor', {
        roomCode: currentRoomCode,
        color: color
    });
    showNotification(`Changing color to ${color}`, 'admin');
};

window.adminRedrawCards = function(targetSocketId, count) {
    if (!isAdmin) return;
    socket.emit('adminRedrawCards', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId,
        count: count || 2
    });
    showNotification(`Making player draw ${count || 2} cards`, 'admin');
};

window.adminResetGame = function() {
    if (!isAdmin) return;
    socket.emit('adminResetGame', { roomCode: currentRoomCode });
    showNotification('Resetting game...', 'admin');
};

window.adminRegisterUser = function() {
    if (!isAdmin) return;
    const username = prompt('Enter username:');
    if (!username) return;
    const password = prompt('Enter password:');
    if (!password) return;
    const makeAdmin = confirm('Make this user an admin?');
    socket.emit('adminRegisterUser', {
        username: username,
        password: password,
        isAdmin: makeAdmin
    });
};

window.adminListUsers = function() {
    if (!isAdmin) return;
    socket.emit('adminListUsers');
};

// Show admin panel if user is admin
window.showAdminPanel = function() {
    if (!isAdmin) {
        showNotification('Not an admin', 'error');
        return;
    }
    const panel = `
=== ADMIN COMMANDS ===
Commands available in browser console:

adminKick(socketId) - Kick a player
adminEndGame() - End current game
adminSkipTurn() - Skip current player's turn
adminViewHands() - View all player hands
adminForceStart() - Force start the game
adminChangeColor(color) - Change top card color (red/blue/green/yellow)
adminRedrawCards(socketId, count) - Make player draw cards
adminResetGame() - Reset the game
adminRegisterUser() - Register a new user
adminListUsers() - List all users

Press F12 to open console
    `;
    showNotification('Admin panel opened - check console', 'admin');
    console.log(panel);
};
