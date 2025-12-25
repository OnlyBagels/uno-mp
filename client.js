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
let currentUser = null;

// DOM Elements - Screens
const accountScreen = document.getElementById('accountScreen');
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

// Guest name generation
function generateGuestName() {
    const colors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Cyan', 'Magenta', 'Gold', 'Silver', 'Bronze', 'Violet', 'Crimson', 'Emerald', 'Sapphire'];
    const animals = ['Lion', 'Tiger', 'Bear', 'Wolf', 'Fox', 'Eagle', 'Hawk', 'Falcon', 'Panda', 'Dragon', 'Phoenix', 'Shark', 'Whale', 'Dolphin', 'Owl', 'Raven', 'Cobra', 'Panther'];
    const objects = ['Sword', 'Shield', 'Crown', 'Star', 'Moon', 'Sun', 'Thunder', 'Lightning', 'Flame', 'Ice', 'Storm', 'Wind', 'Rock', 'Crystal', 'Diamond', 'Gem', 'Arrow', 'Hammer'];

    const color = colors[Math.floor(Math.random() * colors.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const object = objects[Math.floor(Math.random() * objects.length)];

    return `${color}${animal}${object}`;
}

// Winner effects - Confetti explosion
function playWinnerEffects() {
    // Create AudioContext for sound (using Web Audio API)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Play victory fanfare sound
    playVictorySound(audioContext);

    // Confetti burst
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00FF00', '#00BFFF'];

    (function frame() {
        confetti({
            particleCount: 7,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 7,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

// Loser effects - Sad trombone
function playLoserEffects() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    playSadTromboneSound(audioContext);
}

// Victory sound (triumphant notes)
function playVictorySound(audioContext) {
    const notes = [
        { freq: 523.25, time: 0, duration: 0.2 },    // C5
        { freq: 659.25, time: 0.2, duration: 0.2 },  // E5
        { freq: 783.99, time: 0.4, duration: 0.2 },  // G5
        { freq: 1046.50, time: 0.6, duration: 0.4 }  // C6
    ];

    notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'triangle';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + note.time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);

        oscillator.start(audioContext.currentTime + note.time);
        oscillator.stop(audioContext.currentTime + note.time + note.duration);
    });
}

// Sad trombone sound (descending notes)
function playSadTromboneSound(audioContext) {
    const notes = [
        { freq: 392.00, time: 0, duration: 0.3 },    // G4
        { freq: 369.99, time: 0.3, duration: 0.3 },  // F#4
        { freq: 349.23, time: 0.6, duration: 0.3 },  // F4
        { freq: 293.66, time: 0.9, duration: 0.5 }   // D4
    ];

    notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = note.freq;
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime + note.time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);

        oscillator.start(audioContext.currentTime + note.time);
        oscillator.stop(audioContext.currentTime + note.time + note.duration);
    });
}

// Account Screen Tab Switching
document.getElementById('loginTabBtn').addEventListener('click', () => {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('loginTabBtn').classList.add('active');
    document.getElementById('registerTabBtn').classList.remove('active');
});

document.getElementById('registerTabBtn').addEventListener('click', () => {
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTabBtn').classList.add('active');
    document.getElementById('loginTabBtn').classList.remove('active');
});

// Login Handler
document.getElementById('loginBtn').addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Please enter username and password', 'warning');
        return;
    }

    // Store credentials temporarily for session persistence
    sessionStorage.setItem('loginCredentials', JSON.stringify({ username, password }));

    socket.emit('login', { username, password });
});

// Allow Enter key for login
document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginBtn').click();
    }
});

// Register Handler
document.getElementById('registerBtn').addEventListener('click', () => {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;

    if (!username || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    if (password.length < 4) {
        showNotification('Password must be at least 4 characters', 'warning');
        return;
    }

    socket.emit('register', { username, password });
});

// Guest Handler
document.getElementById('guestBtn').addEventListener('click', () => {
    const guestName = generateGuestName();
    currentUser = { username: guestName, isAdmin: false, isMod: false, isGuest: true };

    // Save guest session to localStorage
    localStorage.setItem('wildDrawSession', JSON.stringify(currentUser));

    showNotification(`Welcome, ${guestName}!`, 'success');

    // Show lobby selection screen
    accountScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');

    // Update username display
    document.getElementById('usernameDisplay').textContent = `Guest: ${guestName}`;

    // Auto-fill display name with guest name and make it readonly
    playerNameInput.value = guestName;
    playerNameInput.readOnly = true;
});

// Logout Handler
document.getElementById('logoutBtn').addEventListener('click', () => {
    // Clear stored session
    localStorage.removeItem('wildDrawSession');
    sessionStorage.removeItem('loginCredentials');
    location.reload();
});

// Login/Register Result Handlers
socket.on('loginResult', ({ success, user, message }) => {
    if (success) {
        currentUser = user;

        // Save session to localStorage
        const credentials = sessionStorage.getItem('loginCredentials');
        if (credentials) {
            const { username, password } = JSON.parse(credentials);
            localStorage.setItem('wildDrawSession', JSON.stringify({
                username,
                password,
                isAdmin: user.isAdmin,
                isMod: user.isMod,
                isGuest: false
            }));
            sessionStorage.removeItem('loginCredentials');
        }

        showNotification(`Welcome back, ${user.username}!`, 'success');

        // Show lobby selection screen
        accountScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');

        // Update username display
        document.getElementById('usernameDisplay').textContent = `Logged in as: ${user.username}${user.isAdmin ? ' (Admin)' : ''}`;

        // Auto-fill display name with username and make it readonly
        playerNameInput.value = user.username;
        playerNameInput.readOnly = true;
    } else {
        showNotification(message || 'Login failed', 'error');
        sessionStorage.removeItem('loginCredentials');
    }
});

socket.on('registerResult', ({ success, message }) => {
    if (success) {
        showNotification(message, 'success');
        // Switch to login tab
        document.getElementById('loginTabBtn').click();
        // Clear register form
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerPasswordConfirm').value = '';
    } else {
        showNotification(message || 'Registration failed', 'error');
    }
});

// Event Listeners - Login
createGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        showNotification('Please enter your name', 'warning');
        return;
    }
    playerName = name;
    const maxPlayers = parseInt(maxPlayersSelect.value);
    const password = document.getElementById('passwordInput').value;
    socket.emit('createGame', { playerName: name, maxPlayers, password: password || null });
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
    const password = document.getElementById('joinPasswordInput').value;
    socket.emit('joinGame', { roomCode, playerName: name, password: password || null });
});

// Function to join a lobby from the list
window.joinLobbyFromList = function(roomCode, hasPassword) {
    const name = playerNameInput.value.trim();
    if (!name) {
        showNotification('Please enter your name first', 'warning');
        playerNameInput.focus();
        return;
    }
    playerName = name;

    if (hasPassword) {
        const password = prompt('This lobby is password protected. Enter password:');
        if (password === null) return; // User cancelled
        socket.emit('joinGame', { roomCode, playerName: name, password });
    } else {
        socket.emit('joinGame', { roomCode, playerName: name, password: null });
    }
};

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

// Check for stored session on page load
window.addEventListener('DOMContentLoaded', () => {
    const storedSession = localStorage.getItem('wildDrawSession');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);

            if (session.isGuest) {
                // Restore guest session
                currentUser = session;
                accountScreen.classList.add('hidden');
                loginScreen.classList.remove('hidden');
                document.getElementById('usernameDisplay').textContent = `Guest: ${session.username}`;
                playerNameInput.value = session.username;
                playerNameInput.readOnly = true;
            } else {
                // Auto-login with stored credentials
                socket.emit('login', {
                    username: session.username,
                    password: session.password
                });
            }
        } catch (e) {
            console.error('Failed to restore session:', e);
            localStorage.removeItem('wildDrawSession');
        }
    }
});

// Socket.io event handlers
socket.on('connect', () => {
    console.log('Connected to server');
    mySocketId = socket.id;
    socket.emit('getLobbyList');
});

// Lobby list update
socket.on('lobbyListUpdate', (lobbies) => {
    updateLobbyList(lobbies);
});

socket.on('adminStatus', ({ isAdmin: adminStatus, permissions }) => {
    isAdmin = adminStatus;
    adminPermissions = permissions;
    if (isAdmin) {
        console.log('Admin privileges detected');
        console.log('Permissions:', permissions);
    }
    updateAdminButton();
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
    updateAdminPlayersList(gameState.players);

    // Handle player chooser for Wild Swap Hands
    const playerChooser = document.getElementById('playerChooser');
    if (playerChooser) {
        if (gameState.waitingForPlayerChoice) {
            playerChooser.classList.remove('hidden');

            // Populate player options
            const playerOptions = document.getElementById('playerOptions');
            if (playerOptions) {
                playerOptions.innerHTML = '';

                gameState.players.forEach(player => {
                    // Don't show current player as an option
                    if (player.socketId !== mySocketId) {
                        const button = document.createElement('button');
                        button.className = 'btn player-select-btn';
                        button.textContent = player.name;
                        button.dataset.socketId = player.socketId;
                        button.addEventListener('click', () => {
                            handlePlayerSelection(player.socketId, gameState.pendingColor);
                        });
                        playerOptions.appendChild(button);
                    }
                });
            }
        } else {
            playerChooser.classList.add('hidden');
        }
    }
});

socket.on('chooseColor', () => {
    pendingColorChoice = true;
    colorChooser.classList.remove('hidden');
    updateMessage('Choose a color for your Wild card!');
});

socket.on('cardPlayed', ({ playerName: playedPlayerName, currentPlayer, cardIndex }) => {
    updateMessage(`${playedPlayerName} played a card. ${currentPlayer}'s turn!`);

    // Animation is now handled by the gameState update
    // Removed manual animation trigger to prevent card disappearing bug
});

socket.on('cardDrawn', ({ card, canPlay }) => {
    if (canPlay) {
        updateMessage(`You drew a ${card.value}. You can play it or pass.`);
    } else {
        updateMessage('Drew a card. Turn passed.');
    }

    // Trigger draw animation on the last card (newly drawn)
    setTimeout(() => {
        const cards = playerHand.querySelectorAll('.card');
        if (cards.length > 0) {
            const lastCard = cards[cards.length - 1];
            lastCard.classList.add('card-drawn');
        }
    }, 100);
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

    // Show UNO popup to all players
    const unoPopup = document.getElementById('unoPopup');
    const unoPlayerNameElement = document.getElementById('unoPlayerName');
    if (unoPopup && unoPlayerNameElement) {
        unoPlayerNameElement.textContent = unoPlayerName;
        unoPopup.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            unoPopup.classList.add('hidden');
        }, 3000);
    }
});

socket.on('handsSwapped', ({ player1, player2 }) => {
    updateMessage(`${player1} and ${player2} swapped hands!`);
    showNotification(`${player1} and ${player2} swapped hands!`, 'info');
});

socket.on('unoPenalty', ({ playerName }) => {
    updateMessage(`${playerName} drew 2 cards for not calling UNO!`);
    showNotification(`${playerName} drew 2 cards for not calling UNO!`, 'warning');
});

socket.on('gameOver', ({ winner }) => {
    updateMessage(`🎉 ${winner} wins the game! 🎉`);

    // Check if current player is the winner
    if (winner === playerName) {
        // Winner effects: Confetti!
        showNotification(`🎉 You won! Congratulations! 🎉`, 'success', 5000);
        playWinnerEffects();
    } else {
        // Loser effects: Sad horn
        showNotification(`${winner} wins! Better luck next time!`, 'info', 5000);
        playLoserEffects();
    }

    setTimeout(() => {
        // Return to lobby screen
        loginScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
        gameScreen.classList.add('hidden');
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

// Chat event handlers
socket.on('chatMessage', (data) => {
    displayChatMessage(data);
});

socket.on('playerPromoted', ({ playerName, role }) => {
    showNotification(`${playerName} promoted to ${role}`, 'admin');
    displayChatMessage({
        isSystem: true,
        message: `${playerName} has been promoted to ${role}`
    });
});

socket.on('playerDemoted', ({ playerName }) => {
    showNotification(`${playerName} demoted from moderator`, 'admin');
    displayChatMessage({
        isSystem: true,
        message: `${playerName} has been demoted from moderator`
    });
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

    // Show/hide start button based on creator status
    if (gameState.isCreator) {
        startGameBtn.classList.remove('hidden');
    } else {
        startGameBtn.classList.add('hidden');
    }
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

        // Check if card can be played
        if (gameState.topCard && card.canPlayOn && card.canPlayOn(gameState.topCard)) {
            cardElement.classList.add('playable');
        }

        cardElement.addEventListener('click', () => handleCardClick(index, card, cardElement));
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

    // Format card value for better display
    let displayValue = card.value;

    // Simplify draw cards to use +2 and +4 notation
    if (card.value === 'Wild Draw Four') {
        displayValue = 'Wild<br>+4';
    } else if (card.value === 'Draw Two') {
        displayValue = '+2';
    } else if (card.value === 'Skip') {
        displayValue = '<i class="fa-solid fa-ban"></i><br>Skip';
    } else if (card.value === 'Reverse') {
        displayValue = '<i class="fa-solid fa-rotate"></i><br>Reverse';
    } else if (card.value === 'Wild Swap Hands') {
        displayValue = '<i class="fa-solid fa-arrow-right-arrow-left"></i><br>Swap Hands';
    } else if (card.value === 'Wild Shuffle Hands') {
        displayValue = '<i class="fa-solid fa-shuffle"></i><br>Shuffle';
    }

    cardDiv.innerHTML = `<span class="card-value">${displayValue}</span>`;
    return cardDiv;
}

function handleCardClick(cardIndex, card, cardElement) {
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

function handlePlayerSelection(targetSocketId, chosenColor) {
    socket.emit('swapHands', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId,
        chosenColor: chosenColor
    });

    // Hide player chooser
    const playerChooser = document.getElementById('playerChooser');
    if (playerChooser) {
        playerChooser.classList.add('hidden');
    }
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

    // Display stack information
    if (gameState.stackCount && gameState.stackCount > 0) {
        const stackType = gameState.stackType === 'draw2' ? '+2' : '+4';
        gameMessage.textContent = `⚡ Stack active! ${gameState.stackCount} cards (${stackType}) - Stack or draw!`;
        gameMessage.style.color = '#ff4444';
        gameMessage.style.fontWeight = 'bold';
    }
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

// Admin Menu UI Functions
window.openAdminMenu = function() {
    if (!isAdmin) {
        showNotification('Not an admin', 'error');
        return;
    }
    const modal = document.getElementById('adminMenuModal');
    modal.classList.remove('hidden');
    socket.emit('getGameState', { roomCode: currentRoomCode });
};

window.closeAdminMenu = function() {
    const modal = document.getElementById('adminMenuModal');
    modal.classList.add('hidden');
};

window.adminPromoteToMod = function(targetSocketId) {
    if (!isAdmin) return;
    socket.emit('adminPromoteToMod', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId
    });
    showNotification('Player promoted to moderator', 'admin');
};

window.adminDemoteFromMod = function(targetSocketId) {
    if (!isAdmin) return;
    socket.emit('adminDemoteFromMod', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId
    });
    showNotification('Player demoted from moderator', 'admin');
};

window.adminPromoteToAdmin = function(targetSocketId) {
    if (!isAdmin) return;
    socket.emit('adminPromoteToAdmin', {
        roomCode: currentRoomCode,
        targetSocketId: targetSocketId
    });
    showNotification('Player promoted to admin', 'admin');
};

// Update admin players list
function updateAdminPlayersList(players) {
    const list = document.getElementById('adminPlayersList');
    if (!list) return;

    list.innerHTML = '';
    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'admin-player-item';

        const role = player.isAdmin ? 'Admin' : (player.isMod ? 'Mod' : 'Player');
        const roleClass = player.isAdmin ? 'role-admin' : (player.isMod ? 'role-mod' : 'role-player');

        let buttons = '';
        if (player.socketId !== mySocketId && isAdmin) {
            if (!player.isAdmin) {
                if (player.isMod) {
                    buttons = `
                        <button class="btn-admin-small" onclick="adminDemoteFromMod('${player.socketId}')">Demote</button>
                        <button class="btn-admin-small" onclick="adminPromoteToAdmin('${player.socketId}')">Make Admin</button>
                    `;
                } else {
                    buttons = `
                        <button class="btn-admin-small" onclick="adminPromoteToMod('${player.socketId}')">Make Mod</button>
                        <button class="btn-admin-small" onclick="adminPromoteToAdmin('${player.socketId}')">Make Admin</button>
                    `;
                }
                buttons += `<button class="btn-admin-small btn-admin-kick" onclick="adminKick('${player.socketId}')">Kick</button>`;
            }
        }

        playerDiv.innerHTML = `
            <div class="admin-player-info">
                <span class="admin-player-name">${player.name}</span>
                <span class="admin-player-role ${roleClass}">${role}</span>
            </div>
            <div class="admin-player-actions">${buttons}</div>
        `;
        list.appendChild(playerDiv);
    });
}

// Chat System Functions
let chatMinimized = false;

window.toggleChat = function() {
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.querySelector('.chat-input-area');
    const chatToggle = document.getElementById('chatToggle');

    chatMinimized = !chatMinimized;

    if (chatMinimized) {
        chatMessages.style.display = 'none';
        chatInput.style.display = 'none';
        chatToggle.textContent = '▲';
    } else {
        chatMessages.style.display = 'flex';
        chatInput.style.display = 'flex';
        chatToggle.textContent = '▼';
    }
};

window.sendChatMessage = function() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (!message || !currentRoomCode) return;

    socket.emit('chatMessage', {
        roomCode: currentRoomCode,
        message: message
    });

    chatInput.value = '';
};

// Chat input event listener
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);

// Display chat message
function displayChatMessage(data) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (data.isSystem) {
        messageDiv.className = 'chat-message system-message';
        messageDiv.innerHTML = `
            <span class="chat-timestamp">${timestamp}</span>
            <span class="chat-text">${data.message}</span>
        `;
    } else {
        const messageClass = data.isAdmin ? 'admin-message' : (data.isMod ? 'mod-message' : 'chat-message');
        const roleLabel = data.isAdmin ? '[ADMIN] ' : (data.isMod ? '[MOD] ' : '');

        messageDiv.className = messageClass;
        messageDiv.innerHTML = `
            <div class="chat-message-header">
                <span class="chat-sender">${roleLabel}${data.playerName}</span>
                <span class="chat-timestamp">${timestamp}</span>
            </div>
            <div class="chat-text">${data.message}</div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show/hide admin button
function updateAdminButton() {
    const adminBtn = document.getElementById('adminMenuBtn');
    if (adminBtn) {
        if (isAdmin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }
    }
}

// Update lobby list display
function updateLobbyList(lobbies) {
    const lobbyListContainer = document.getElementById('lobbyList');
    if (!lobbyListContainer) return;

    if (lobbies.length === 0) {
        lobbyListContainer.innerHTML = '<p class="no-lobbies">No active lobbies. Create one to get started!</p>';
        return;
    }

    lobbyListContainer.innerHTML = '';
    lobbies.forEach(lobby => {
        const lobbyDiv = document.createElement('div');
        lobbyDiv.className = 'lobby-item';
        if (lobby.gameStarted) {
            lobbyDiv.classList.add('lobby-in-progress');
        }

        const statusText = lobby.gameStarted ? 'In Progress' : 'Waiting';
        const statusClass = lobby.gameStarted ? 'status-in-progress' : 'status-waiting';
        const lockIcon = lobby.hasPassword ? '🔒 ' : '';

        lobbyDiv.innerHTML = `
            <div class="lobby-info">
                <div class="lobby-header">
                    <span class="lobby-code">${lockIcon}${lobby.roomCode}</span>
                    <span class="lobby-status ${statusClass}">${statusText}</span>
                </div>
                <div class="lobby-details">
                    <span class="lobby-creator">Created by: ${lobby.creatorName}</span>
                    <span class="lobby-players">${lobby.playerCount}/${lobby.maxPlayers} players</span>
                </div>
            </div>
            <button class="btn btn-join-lobby"
                    onclick="joinLobbyFromList('${lobby.roomCode}', ${lobby.hasPassword})"
                    ${lobby.playerCount >= lobby.maxPlayers && !lobby.gameStarted ? 'disabled' : ''}>
                ${lobby.gameStarted ? 'Join (In Progress)' : lobby.playerCount >= lobby.maxPlayers ? 'Full' : 'Join'}
            </button>
        `;
        lobbyListContainer.appendChild(lobbyDiv);
    });
}
