// Awful Answers Client
const socket = io();

// State
let currentRoomCode = null;
let playerName = null;
let selectedCards = [];
let isCardCzar = false;

// DOM Elements - Screens
const lobbyScreen = document.getElementById('lobbyScreen');
const waitingRoomScreen = document.getElementById('waitingRoomScreen');
const gameScreen = document.getElementById('gameScreen');

// DOM Elements - Lobby
const playerNameInput = document.getElementById('playerNameInput');
const maxPlayersSelect = document.getElementById('maxPlayersSelect');
const passwordInput = document.getElementById('passwordInput');
const createGameBtn = document.getElementById('createGameBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinPasswordInput = document.getElementById('joinPasswordInput');
const joinGameBtn = document.getElementById('joinGameBtn');
const backToHub = document.getElementById('backToHub');

// DOM Elements - Waiting Room
const waitingRoomCode = document.getElementById('waitingRoomCode');
const playerCount = document.getElementById('playerCount');
const maxPlayerCount = document.getElementById('maxPlayerCount');
const playersList = document.getElementById('playersList');
const startGameBtn = document.getElementById('startGameBtn');
const leaveWaitingBtn = document.getElementById('leaveWaitingBtn');

// DOM Elements - Game
const gameRoomCode = document.getElementById('gameRoomCode');
const playersScores = document.getElementById('playersScores');
const roundStatus = document.getElementById('roundStatus');
const roundSubStatus = document.getElementById('roundSubStatus');
const blackCardDisplay = document.getElementById('blackCardDisplay');
const czarAnswersArea = document.getElementById('czarAnswersArea');
const submittedAnswers = document.getElementById('submittedAnswers');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerText = document.getElementById('winnerText');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const playerHand = document.getElementById('playerHand');
const handStatus = document.getElementById('handStatus');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const leaveGameBtn = document.getElementById('leaveGameBtn');

// DOM Elements - Modal
const gameOverModal = document.getElementById('gameOverModal');
const gameWinnerText = document.getElementById('gameWinnerText');
const returnToLobbyBtn = document.getElementById('returnToLobbyBtn');

// Notification System
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<div class="notification-message">${message}</div>`;

    container.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Event Listeners - Lobby
backToHub.addEventListener('click', () => {
    window.location.href = '/';
});

createGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        showNotification('Please enter your name', 'warning');
        return;
    }

    playerName = name;
    const maxPlayers = parseInt(maxPlayersSelect.value);
    const password = passwordInput.value;

    socket.emit('createAwfulGame', { playerName: name, maxPlayers, password: password || null });
});

joinGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();

    if (!name) {
        showNotification('Please enter your name', 'warning');
        return;
    }

    if (!roomCode) {
        showNotification('Please enter room code', 'warning');
        return;
    }

    playerName = name;
    const password = joinPasswordInput.value;

    socket.emit('joinAwfulGame', { roomCode, playerName: name, password: password || null });
});

// Event Listeners - Waiting Room
startGameBtn.addEventListener('click', () => {
    socket.emit('startAwfulGame', { roomCode: currentRoomCode });
});

leaveWaitingBtn.addEventListener('click', () => {
    socket.emit('leaveAwfulGame', { roomCode: currentRoomCode });
    location.reload();
});

// Event Listeners - Game
leaveGameBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to leave the game?')) {
        socket.emit('leaveAwfulGame', { roomCode: currentRoomCode });
        location.reload();
    }
});

submitAnswerBtn.addEventListener('click', () => {
    if (selectedCards.length === 0) {
        showNotification('Please select card(s) to submit', 'warning');
        return;
    }

    socket.emit('submitAnswer', {
        roomCode: currentRoomCode,
        cardIndexes: selectedCards
    });

    selectedCards = [];
    submitAnswerBtn.classList.add('hidden');
});

nextRoundBtn.addEventListener('click', () => {
    socket.emit('nextRound', { roomCode: currentRoomCode });
});

returnToLobbyBtn.addEventListener('click', () => {
    location.reload();
});

// Socket Events
socket.on('gameCreated', ({ roomCode, gameState }) => {
    currentRoomCode = roomCode;
    showNotification('Game created!', 'success');

    lobbyScreen.classList.add('hidden');
    waitingRoomScreen.classList.remove('hidden');

    waitingRoomCode.textContent = roomCode;
    gameRoomCode.textContent = roomCode;
    startGameBtn.classList.remove('hidden'); // Host can start

    updateLobby(gameState);
});

socket.on('gameState', (gameState) => {
    if (!gameState.gameStarted) {
        updateLobby(gameState);
    } else {
        renderGame(gameState);
    }
});

socket.on('gameStarted', (gameState) => {
    waitingRoomScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    showNotification('Game started!', 'success');
    renderGame(gameState);
});

socket.on('showAnswers', ({ answers }) => {
    // Card Czar views all submitted answers
    czarAnswersArea.classList.remove('hidden');
    submittedAnswers.innerHTML = '';

    answers.forEach(({ id, cards }) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-option';
        answerDiv.onclick = () => selectWinner(id);

        cards.forEach(card => {
            const cardText = document.createElement('div');
            cardText.className = 'answer-card-text';
            cardText.textContent = card;
            answerDiv.appendChild(cardText);
        });

        submittedAnswers.appendChild(answerDiv);
    });
});

socket.on('roundWinner', ({ winner, gameState }) => {
    showNotification(`${winner.name} won this round!`, 'success', 5000);

    // Show winner display
    czarAnswersArea.classList.add('hidden');
    winnerDisplay.classList.remove('hidden');
    winnerText.textContent = `${winner.name} wins the round! (+1 Awesome Point)`;

    // Update game state
    renderGame(gameState);
});

socket.on('gameOver', ({ winner, points }) => {
    gameOverModal.classList.remove('hidden');
    const pointsText = points ? ` (+${points} points)` : '';
    gameWinnerText.textContent = `${winner} wins the game!${pointsText}`;
    showNotification(`🎉 ${winner} wins!${pointsText} 🎉`, 'success', 8000);
});

socket.on('playerLeft', ({ playerName: leftPlayer, gameState }) => {
    showNotification(`${leftPlayer} left the game`, 'info');
    if (gameState.gameStarted) {
        renderGame(gameState);
    } else {
        updateLobby(gameState);
    }
});

socket.on('error', ({ message }) => {
    showNotification(message, 'error');
});

// Render Functions
function updateLobby(gameState) {
    currentRoomCode = gameState.roomCode;
    waitingRoomCode.textContent = gameState.roomCode;
    playerCount.textContent = gameState.players.length;
    maxPlayerCount.textContent = gameState.maxPlayers;

    playersList.innerHTML = '';
    gameState.players.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        if (index === 0) {
            playerDiv.classList.add('host');
            playerDiv.textContent = `${player.name} 👑`;
        } else {
            playerDiv.textContent = player.name;
        }
        playersList.appendChild(playerDiv);
    });
}

function renderGame(gameState) {
    isCardCzar = gameState.isCardCzar;

    // Render players and scores
    renderPlayerScores(gameState);

    // Render black card
    renderBlackCard(gameState.currentBlackCard);

    // Update status
    updateRoundStatus(gameState);

    // Render hand
    renderPlayerHand(gameState);

    // Hide/show elements based on state
    if (gameState.roundWinner) {
        czarAnswersArea.classList.add('hidden');
        if (isCardCzar) {
            nextRoundBtn.classList.remove('hidden');
        }
    } else {
        winnerDisplay.classList.add('hidden');
    }
}

function renderPlayerScores(gameState) {
    playersScores.innerHTML = '';

    gameState.players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-score';

        if (player.isCardCzar) {
            playerDiv.classList.add('card-czar');
        } else if (player.hasSubmitted) {
            playerDiv.classList.add('submitted');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = player.name;
        if (player.isCardCzar) {
            nameSpan.textContent += ' 👑';
        }

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'score-value';
        scoreSpan.textContent = player.score || 0;

        playerDiv.appendChild(nameSpan);
        playerDiv.appendChild(scoreSpan);
        playersScores.appendChild(playerDiv);
    });
}

function renderBlackCard(blackCard) {
    if (!blackCard) return;

    const cardText = typeof blackCard === 'object' ? blackCard.text : blackCard;
    const pickCount = typeof blackCard === 'object' ? (blackCard.pick || 1) : 1;

    blackCardDisplay.innerHTML = `
        <div class="card-content">${cardText}</div>
        ${pickCount > 1 ? `<div class="pick-indicator">Pick ${pickCount}</div>` : ''}
    `;
}

function updateRoundStatus(gameState) {
    if (isCardCzar) {
        roundStatus.textContent = "You are the Card Czar!";
        roundSubStatus.textContent = gameState.allSubmitted
            ? "All answers submitted. Choose the funniest one!"
            : `Waiting for answers... (${gameState.submittedCount}/${gameState.totalPlayers})`;
    } else {
        roundStatus.textContent = `Card Czar: ${gameState.cardCzarName}`;
        roundSubStatus.textContent = gameState.allSubmitted
            ? "All answers submitted. Card Czar is choosing..."
            : "Submit your funniest card(s)!";
    }
}

function renderPlayerHand(gameState) {
    selectedCards = [];
    playerHand.innerHTML = '';

    if (isCardCzar) {
        handStatus.textContent = "You're the Card Czar this round - sit back and judge!";
        submitAnswerBtn.classList.add('hidden');
        return;
    }

    const pickCount = typeof gameState.currentBlackCard === 'object'
        ? (gameState.currentBlackCard.pick || 1)
        : 1;

    handStatus.textContent = gameState.roundWinner
        ? "Round complete! Waiting for next round..."
        : `Select ${pickCount} card(s) to submit`;

    gameState.playerHand.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'white-card';
        cardDiv.textContent = card;

        if (gameState.roundWinner || gameState.allSubmitted) {
            cardDiv.classList.add('disabled');
        } else {
            cardDiv.onclick = () => toggleCardSelection(index, pickCount);
        }

        playerHand.appendChild(cardDiv);
    });

    if (!gameState.roundWinner && !gameState.allSubmitted) {
        submitAnswerBtn.classList.remove('hidden');
    } else {
        submitAnswerBtn.classList.add('hidden');
    }
}

function toggleCardSelection(index, maxPicks) {
    const cards = playerHand.children;
    const card = cards[index];

    if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        selectedCards = selectedCards.filter(i => i !== index);
    } else {
        if (selectedCards.length >= maxPicks) {
            // Remove oldest selection
            const oldIndex = selectedCards.shift();
            cards[oldIndex].classList.remove('selected');
        }
        selectedCards.push(index);
        card.classList.add('selected');
    }
}

function selectWinner(winnerId) {
    socket.emit('selectWinner', {
        roomCode: currentRoomCode,
        winnerSocketId: winnerId
    });
}

// Load player name from session
window.addEventListener('DOMContentLoaded', () => {
    const storedSession = localStorage.getItem('partyGamesSession');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);
            playerNameInput.value = session.username || '';
        } catch (e) {
            // Ignore
        }
    }
});
