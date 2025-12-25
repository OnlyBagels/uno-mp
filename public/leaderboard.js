// Leaderboard Client
const socket = io();

// State
let currentUser = null;
let currentGameType = 'total';
let currentPage = 1;
let searchTerm = '';
const ITEMS_PER_PAGE = 50;

// DOM Elements
const gameTabs = document.querySelectorAll('.game-tab');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const leaderboardTable = document.getElementById('leaderboardTable');
const leaderboardBody = document.getElementById('leaderboardBody');
const loadingSpinner = document.getElementById('loadingSpinner');
const statsSidebar = document.getElementById('statsSidebar');
const playerStatsContent = document.getElementById('playerStatsContent');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

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

// Load leaderboard data
async function loadLeaderboard() {
    loadingSpinner.style.display = 'block';
    leaderboardTable.classList.remove('loaded');

    try {
        let url;
        if (searchTerm) {
            url = `/api/leaderboard/search/${encodeURIComponent(searchTerm)}?gameType=${currentGameType}&limit=${ITEMS_PER_PAGE}`;
        } else {
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            url = `/api/leaderboard/${currentGameType}?limit=${ITEMS_PER_PAGE}&offset=${offset}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        renderLeaderboard(data);

        loadingSpinner.style.display = 'none';
        leaderboardTable.classList.add('loaded');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showNotification('Failed to load leaderboard', 'error');
        loadingSpinner.style.display = 'none';
    }
}

// Render leaderboard table
function renderLeaderboard(data) {
    leaderboardBody.innerHTML = '';

    if (data.length === 0) {
        leaderboardBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #64748b;">No players found</td></tr>';
        return;
    }

    data.forEach((player, index) => {
        const rank = searchTerm ? '—' : ((currentPage - 1) * ITEMS_PER_PAGE + index + 1);
        const row = document.createElement('tr');

        // Add rank classes
        if (rank === 1) row.classList.add('rank-1');
        else if (rank === 2) row.classList.add('rank-2');
        else if (rank === 3) row.classList.add('rank-3');

        // Get wins and points based on game type
        let wins, points;
        if (currentGameType === 'wildcard') {
            wins = player.wildcard_wins;
            points = player.wildcard_points;
        } else if (currentGameType === 'awful_answers') {
            wins = player.awful_answers_wins;
            points = player.awful_answers_points;
        } else {
            wins = player.total_wins;
            points = player.total_points;
        }

        // Rank cell with medals
        let rankHTML = `<td class="rank-cell`;
        if (rank === 1) rankHTML += ` medal gold">`;
        else if (rank === 2) rankHTML += ` medal silver">`;
        else if (rank === 3) rankHTML += ` medal bronze">`;
        else rankHTML += `">`;
        rankHTML += rank + `</td>`;

        row.innerHTML = `
            ${rankHTML}
            <td class="player-name">${escapeHtml(player.username)}</td>
            <td>${wins}</td>
            <td><strong>${points}</strong></td>
        `;

        leaderboardBody.appendChild(row);
    });

    // Update pagination
    updatePagination(data.length);
}

// Update pagination controls
function updatePagination(dataLength) {
    pageInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1 || searchTerm !== '';
    nextPageBtn.disabled = dataLength < ITEMS_PER_PAGE || searchTerm !== '';
}

// Load player stats
async function loadPlayerStats(username) {
    try {
        const response = await fetch(`/api/stats/${encodeURIComponent(username)}`);
        if (!response.ok) {
            playerStatsContent.innerHTML = '<p class="login-prompt">No stats yet. Play to start!</p>';
            return;
        }

        const stats = await response.json();
        renderPlayerStats(stats);
    } catch (error) {
        console.error('Error loading player stats:', error);
        playerStatsContent.innerHTML = '<p class="login-prompt">Failed to load stats</p>';
    }
}

// Render player stats sidebar
function renderPlayerStats(stats) {
    playerStatsContent.innerHTML = `
        <div class="stat-card">
            <h3>Overall Rank</h3>
            <div class="stat-value">#${stats.ranks.total}</div>
            <div class="stat-rank">${stats.total_points} points</div>
        </div>

        <div class="stat-card">
            <h3>Total Wins</h3>
            <div class="stat-value">${stats.total_wins}</div>
        </div>

        <div class="stat-section">
            <h3>🃏 WildCard</h3>
            <div class="game-stat">
                <span class="game-stat-label">Rank</span>
                <span class="game-stat-value">#${stats.ranks.wildcard}</span>
            </div>
            <div class="game-stat">
                <span class="game-stat-label">Wins</span>
                <span class="game-stat-value">${stats.wildcard_wins}</span>
            </div>
            <div class="game-stat">
                <span class="game-stat-label">Points</span>
                <span class="game-stat-value">${stats.wildcard_points}</span>
            </div>
        </div>

        <div class="stat-section">
            <h3>😈 Awful Answers</h3>
            <div class="game-stat">
                <span class="game-stat-label">Rank</span>
                <span class="game-stat-value">#${stats.ranks.awful_answers}</span>
            </div>
            <div class="game-stat">
                <span class="game-stat-label">Wins</span>
                <span class="game-stat-value">${stats.awful_answers_wins}</span>
            </div>
            <div class="game-stat">
                <span class="game-stat-label">Points</span>
                <span class="game-stat-value">${stats.awful_answers_points}</span>
            </div>
        </div>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event Listeners
gameTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        gameTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentGameType = tab.dataset.game;
        currentPage = 1;
        loadLeaderboard();
    });
});

searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();
    if (searchTerm.length > 0) {
        currentPage = 1;
        loadLeaderboard();
    } else if (searchTerm.length === 0) {
        loadLeaderboard();
    }
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    currentPage = 1;
    loadLeaderboard();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadLeaderboard();
    }
});

nextPageBtn.addEventListener('click', () => {
    currentPage++;
    loadLeaderboard();
});

// Check for logged in user
window.addEventListener('DOMContentLoaded', async () => {
    // Check session via API
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        if (data.user) {
            currentUser = data.user.username;
            await loadPlayerStats(currentUser);
        }
    } catch (e) {
        console.log('No active session');
    }

    // Load leaderboard
    loadLeaderboard();
});

// Listen for win events from socket
socket.on('playerWon', async ({ username, gameType, points }) => {
    if (username === currentUser) {
        showNotification(`You won! +${points} points`, 'success');
        await loadPlayerStats(username);
    }
    // Refresh leaderboard if we're on the relevant game type
    if (gameType === currentGameType || currentGameType === 'total') {
        loadLeaderboard();
    }
});
