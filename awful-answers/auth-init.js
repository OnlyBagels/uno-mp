// Unified Authentication Initialization for Awful Answers
// This script checks the main hub session and initializes the user

let currentUser = null;

(async function initAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();

        if (data.user) {
            // User is logged in from main hub
            currentUser = data.user;

            // Auto-fill player name
            const playerNameInput = document.getElementById('playerNameInput');
            if (playerNameInput) {
                playerNameInput.value = data.user.username;
                playerNameInput.readOnly = true;
            }

            console.log('User authenticated:', data.user.username);
        } else {
            // No session found, redirect to main hub
            window.location.href = '/?error=login_required';
        }
    } catch (e) {
        console.error('Failed to check session:', e);
        window.location.href = '/?error=session_error';
    }
})();

// Setup back to hub button
document.addEventListener('DOMContentLoaded', () => {
    const backToHub = document.getElementById('backToHub');
    if (backToHub) {
        backToHub.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
});
