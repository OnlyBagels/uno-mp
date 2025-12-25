// Client-side for Party Games Hub
const socket = io();

// State
let currentUser = null;

// DOM Elements
const accountScreen = document.getElementById('accountScreen');
const gameSelectionScreen = document.getElementById('gameSelectionScreen');
const usernameDisplay = document.getElementById('usernameDisplay');

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.getElementById(`${tabName}TabBtn`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

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

// Login
document.getElementById('loginBtn').addEventListener('click', () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Please enter username and password', 'warning');
        return;
    }

    socket.emit('login', { username, password });
});

document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginBtn').click();
    }
});

// Register
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

// Guest Login
document.getElementById('guestBtn').addEventListener('click', () => {
    const username = document.getElementById('guestUsername').value.trim();

    if (!username) {
        showNotification('Please enter a username', 'warning');
        return;
    }

    socket.emit('guestLogin', { username });
});

document.getElementById('guestUsername').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('guestBtn').click();
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('partyGamesSession');
    location.reload();
});

// Socket Events
socket.on('loginResult', ({ success, user, message }) => {
    if (success) {
        currentUser = user;

        // Save session
        if (!user.isGuest) {
            // For registered users, store minimal info
            localStorage.setItem('partyGamesSession', JSON.stringify({
                username: user.username,
                isGuest: false
            }));
        }

        showNotification(`Welcome, ${user.username}!`, 'success');

        // Show game selection
        accountScreen.classList.add('hidden');
        gameSelectionScreen.classList.remove('hidden');

        usernameDisplay.textContent = user.username;
        if (user.isAdmin) {
            usernameDisplay.textContent += ' (Admin)';
        }
    } else {
        showNotification(message || 'Login failed', 'error');
    }
});

socket.on('registerResult', ({ success, message }) => {
    if (success) {
        showNotification(message, 'success');
        showTab('login');
        // Clear form
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerPasswordConfirm').value = '';
    } else {
        showNotification(message, 'error');
    }
});

// Game Selection
function selectGame(gameType) {
    // Redirect to game
    window.location.href = `/${gameType}`;
}

// Auto-login on page load
window.addEventListener('DOMContentLoaded', () => {
    const storedSession = localStorage.getItem('partyGamesSession');
    if (storedSession) {
        try {
            const session = JSON.parse(storedSession);
            if (!session.isGuest) {
                // For registered users, they'll need to log in again for security
                // We just keep the username filled in
                document.getElementById('loginUsername').value = session.username;
            }
        } catch (e) {
            localStorage.removeItem('partyGamesSession');
        }
    }
});
