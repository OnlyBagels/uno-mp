const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Create/connect to database
const db = new sqlite3.Database(path.join(__dirname, 'wilddraw.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database schema
function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            is_mod INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            console.log('Users table ready');
            createDefaultAdmin();
        }
    });
}

// Create default admin account
function createDefaultAdmin() {
    const defaultUsername = 'admin';
    const defaultPassword = 'password';

    // Check if admin already exists
    db.get('SELECT id FROM users WHERE username = ?', [defaultUsername], (err, row) => {
        if (err) {
            console.error('Error checking for admin:', err);
            return;
        }

        if (!row) {
            // Create default admin
            bcrypt.hash(defaultPassword, 10, (err, hash) => {
                if (err) {
                    console.error('Error hashing password:', err);
                    return;
                }

                db.run(
                    'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)',
                    [defaultUsername, hash],
                    (err) => {
                        if (err) {
                            console.error('Error creating default admin:', err);
                        } else {
                            console.log('Default admin account created (username: admin, password: password)');
                        }
                    }
                );
            });
        }
    });
}

// User authentication
function authenticateUser(username, password, callback) {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return callback(err, null);
        }

        if (!user) {
            return callback(null, { success: false, message: 'Invalid username or password' });
        }

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (err) {
                return callback(err, null);
            }

            if (result) {
                callback(null, {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        isAdmin: user.is_admin === 1,
                        isMod: user.is_mod === 1
                    }
                });
            } else {
                callback(null, { success: false, message: 'Invalid username or password' });
            }
        });
    });
}

// Create new user
function createUser(username, password, isAdmin, callback) {
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return callback(err, null);
        }

        db.run(
            'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
            [username, hash, isAdmin ? 1 : 0],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return callback(null, { success: false, message: 'Username already exists' });
                    }
                    return callback(err, null);
                }

                callback(null, {
                    success: true,
                    userId: this.lastID,
                    message: 'User created successfully'
                });
            }
        );
    });
}

// Get user by ID
function getUserById(userId, callback) {
    db.get('SELECT id, username, is_admin, is_mod FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return callback(err, null);
        }

        if (!user) {
            return callback(null, null);
        }

        callback(null, {
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin === 1,
            isMod: user.is_mod === 1
        });
    });
}

// Update user admin status
function setUserAdmin(userId, isAdmin, callback) {
    db.run(
        'UPDATE users SET is_admin = ? WHERE id = ?',
        [isAdmin ? 1 : 0, userId],
        (err) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { success: true });
        }
    );
}

// Update user mod status
function setUserMod(userId, isMod, callback) {
    db.run(
        'UPDATE users SET is_mod = ? WHERE id = ?',
        [isMod ? 1 : 0, userId],
        (err) => {
            if (err) {
                return callback(err, null);
            }
            callback(null, { success: true });
        }
    );
}

// Get all users
function getAllUsers(callback) {
    db.all('SELECT id, username, is_admin, is_mod, created_at FROM users', (err, users) => {
        if (err) {
            return callback(err, null);
        }

        const formattedUsers = users.map(user => ({
            id: user.id,
            username: user.username,
            isAdmin: user.is_admin === 1,
            isMod: user.is_mod === 1,
            createdAt: user.created_at
        }));

        callback(null, formattedUsers);
    });
}

module.exports = {
    authenticateUser,
    createUser,
    getUserById,
    setUserAdmin,
    setUserMod,
    getAllUsers
};
