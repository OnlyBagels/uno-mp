// Leaderboard system with SQLite
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../leaderboard.db');
const db = new Database(DB_PATH);

// Initialize database tables
function initializeDatabase() {
    // Player stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS player_stats (
            username TEXT PRIMARY KEY,
            wildcard_wins INTEGER DEFAULT 0,
            wildcard_points INTEGER DEFAULT 0,
            awful_answers_wins INTEGER DEFAULT 0,
            awful_answers_points INTEGER DEFAULT 0,
            total_wins INTEGER DEFAULT 0,
            total_points INTEGER DEFAULT 0,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_total_points ON player_stats(total_points DESC);
        CREATE INDEX IF NOT EXISTS idx_wildcard_points ON player_stats(wildcard_points DESC);
        CREATE INDEX IF NOT EXISTS idx_awful_answers_points ON player_stats(awful_answers_points DESC);
    `);

    console.log('✅ Leaderboard database initialized');
}

// Get or create player stats
function getPlayerStats(username) {
    const stmt = db.prepare('SELECT * FROM player_stats WHERE username = ?');
    let stats = stmt.get(username);

    if (!stats) {
        // Create new player entry
        const insert = db.prepare(`
            INSERT INTO player_stats (username) VALUES (?)
        `);
        insert.run(username);
        stats = stmt.get(username);
    }

    return stats;
}

// Record a win for a player
function recordWin(username, gameType) {
    // Random points between 80-200
    const points = Math.floor(Math.random() * 121) + 80;

    const update = db.prepare(`
        UPDATE player_stats
        SET ${gameType}_wins = ${gameType}_wins + 1,
            ${gameType}_points = ${gameType}_points + ?,
            total_wins = total_wins + 1,
            total_points = total_points + ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE username = ?
    `);

    // Ensure player exists first
    getPlayerStats(username);

    update.run(points, points, username);

    return {
        points,
        newStats: getPlayerStats(username)
    };
}

// Get leaderboard (overall or by game)
function getLeaderboard(gameType = 'total', limit = 100, offset = 0) {
    let orderBy = 'total_points';

    if (gameType === 'wildcard') {
        orderBy = 'wildcard_points';
    } else if (gameType === 'awful_answers') {
        orderBy = 'awful_answers_points';
    }

    const stmt = db.prepare(`
        SELECT
            username,
            wildcard_wins,
            wildcard_points,
            awful_answers_wins,
            awful_answers_points,
            total_wins,
            total_points,
            last_updated
        FROM player_stats
        ORDER BY ${orderBy} DESC
        LIMIT ? OFFSET ?
    `);

    return stmt.all(limit, offset);
}

// Search for specific players
function searchPlayers(searchTerm, gameType = 'total', limit = 50) {
    let orderBy = 'total_points';

    if (gameType === 'wildcard') {
        orderBy = 'wildcard_points';
    } else if (gameType === 'awful_answers') {
        orderBy = 'awful_answers_points';
    }

    const stmt = db.prepare(`
        SELECT
            username,
            wildcard_wins,
            wildcard_points,
            awful_answers_wins,
            awful_answers_points,
            total_wins,
            total_points,
            last_updated
        FROM player_stats
        WHERE username LIKE ?
        ORDER BY ${orderBy} DESC
        LIMIT ?
    `);

    return stmt.all(`%${searchTerm}%`, limit);
}

// Get player rank in leaderboard
function getPlayerRank(username, gameType = 'total') {
    let pointsColumn = 'total_points';

    if (gameType === 'wildcard') {
        pointsColumn = 'wildcard_points';
    } else if (gameType === 'awful_answers') {
        pointsColumn = 'awful_answers_points';
    }

    const stats = getPlayerStats(username);
    if (!stats) return null;

    const stmt = db.prepare(`
        SELECT COUNT(*) as rank
        FROM player_stats
        WHERE ${pointsColumn} > ?
    `);

    const result = stmt.get(stats[pointsColumn]);
    return result.rank + 1; // +1 because we want rank starting from 1
}

// Initialize on module load
initializeDatabase();

module.exports = {
    getPlayerStats,
    recordWin,
    getLeaderboard,
    searchPlayers,
    getPlayerRank
};
