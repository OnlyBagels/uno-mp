// Unified Authentication Initialization for WildCard
// This script checks the main hub session and initializes the user

(async function initAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();

        if (data.user) {
            // User is logged in from main hub
            currentUser = data.user;

            // Update username display
            const displayText = data.user.isGuest
                ? `Guest: ${data.user.username}`
                : `Logged in as: ${data.user.username}${data.user.isAdmin ? ' (Admin)' : ''}`;

            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.textContent = displayText;
            }

            // Auto-fill display name
            const playerNameInput = document.getElementById('playerNameInput');
            if (playerNameInput) {
                playerNameInput.value = data.user.username;
                playerNameInput.readOnly = true;
            }

            // Show notification
            if (typeof showNotification === 'function') {
                showNotification(`Welcome, ${data.user.username}!`, 'success');
            }
        } else {
            // No session found, redirect to main hub
            window.location.href = '/?error=login_required';
        }
    } catch (e) {
        console.error('Failed to check session:', e);
        window.location.href = '/?error=session_error';
    }
})();

// Override logout button to return to main hub
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        // Remove all existing event listeners by cloning
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);

        // Add new logout handler
        newLogoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (error) {
                window.location.href = '/';
            }
        });
    }
});
