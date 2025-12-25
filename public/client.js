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
document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showNotification('Please enter username and password', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showNotification(`Welcome, ${data.user.username}!`, 'success');

            // Show game selection
            accountScreen.classList.add('hidden');
            gameSelectionScreen.classList.remove('hidden');
            usernameDisplay.textContent = data.user.username;
            if (data.user.isAdmin) {
                usernameDisplay.textContent += ' (Admin)';
            }
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        showNotification('Login error. Please try again.', 'error');
    }
});

document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('loginBtn').click();
    }
});

// Register
document.getElementById('registerBtn').addEventListener('click', async () => {
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

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            showTab('login');
            // Clear form
            document.getElementById('registerUsername').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerPasswordConfirm').value = '';
        } else {
            showNotification(data.message, 'error');
        }
    } catch (error) {
        showNotification('Registration error. Please try again.', 'error');
    }
});

// Guest Login
document.getElementById('guestBtn').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/guest-login', {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showNotification(`Welcome, ${data.user.username}!`, 'success');

            // Show game selection
            accountScreen.classList.add('hidden');
            gameSelectionScreen.classList.remove('hidden');
            usernameDisplay.textContent = data.user.username;
        } else {
            showNotification('Failed to create guest account', 'error');
        }
    } catch (error) {
        showNotification('Guest login error. Please try again.', 'error');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/logout', { method: 'POST' });
        location.reload();
    } catch (error) {
        location.reload();
    }
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
    // Check for age warning on Awful Answers
    if (gameType === 'awful-answers') {
        // Check if user has already accepted
        const ageWarningAccepted = localStorage.getItem('awfulAnswersAgeWarning');

        if (ageWarningAccepted !== 'accepted') {
            showAgeWarningModal(gameType);
            return;
        }
    }

    // Redirect to game
    window.location.href = `/${gameType}`;
}

// Age Warning Modal for Awful Answers
function showAgeWarningModal(gameType) {
    const modal = document.createElement('div');
    modal.className = 'age-warning-modal';
    modal.innerHTML = `
        <div class="age-warning-content">
            <h2>⚠️ Content Warning</h2>
            <p class="warning-text">Awful Answers contains mature content including:</p>
            <ul class="warning-list">
                <li>Graphic and offensive humor</li>
                <li>References to drugs, alcohol, and adult themes</li>
                <li>Sexually explicit material</li>
                <li>Dark and controversial topics</li>
            </ul>
            <p class="age-requirement"><strong>You must be 18+ to play this game.</strong></p>

            <div class="remember-choice">
                <label>
                    <input type="checkbox" id="rememberAgeWarning">
                    Remember my decision (don't show this again)
                </label>
            </div>

            <div class="warning-buttons">
                <button class="btn btn-decline" onclick="closeAgeWarning()">Decline</button>
                <button class="btn btn-accept" onclick="acceptAgeWarning('${gameType}')">I'm 18+, Accept</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeAgeWarning() {
    const modal = document.querySelector('.age-warning-modal');
    if (modal) {
        modal.remove();
    }
}

function acceptAgeWarning(gameType) {
    const rememberCheckbox = document.getElementById('rememberAgeWarning');

    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('awfulAnswersAgeWarning', 'accepted');
    }

    closeAgeWarning();
    window.location.href = `/${gameType}`;
}

// Check for OAuth success
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('oauth') === 'success') {
    // User logged in via OAuth, fetch their data
    fetch('/auth/user')
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                currentUser = data.user;
                showNotification(`Welcome, ${data.user.username}!`, 'success');
                accountScreen.classList.add('hidden');
                gameSelectionScreen.classList.remove('hidden');
                usernameDisplay.textContent = data.user.username;
                if (data.user.isDiscord) {
                    usernameDisplay.textContent += ' (Discord)';
                } else if (data.user.isGoogle) {
                    usernameDisplay.textContent += ' (Google)';
                }
            }
        });

    // Clean up URL
    window.history.replaceState({}, document.title, '/');
}

// Auto-login on page load - check for existing session
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();

        if (data.user) {
            // User has an active session
            currentUser = data.user;
            accountScreen.classList.add('hidden');
            gameSelectionScreen.classList.remove('hidden');
            usernameDisplay.textContent = data.user.username;

            if (data.user.isAdmin) {
                usernameDisplay.textContent += ' (Admin)';
            } else if (data.user.isDiscord) {
                usernameDisplay.textContent += ' (Discord)';
            } else if (data.user.isGoogle) {
                usernameDisplay.textContent += ' (Google)';
            }
        }
    } catch (e) {
        // No session, show login screen
        console.log('No active session');
    }
});
