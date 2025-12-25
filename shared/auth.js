// File-based authentication for persistence on Render
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../users.json');

// Load users from file or create default
let users = new Map();

function loadUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            const userArray = JSON.parse(data);
            users = new Map(userArray);
            console.log('✅ Loaded users from file');
        } else {
            // Create default admin
            users.set('admin', { username: 'admin', password: 'admin', isAdmin: true, isMod: false });
            saveUsers();
            console.log('✅ Created default admin account');
        }
    } catch (err) {
        console.error('Error loading users:', err);
        users.set('admin', { username: 'admin', password: 'admin', isAdmin: true, isMod: false });
    }
}

function saveUsers() {
    try {
        const userArray = Array.from(users.entries());
        fs.writeFileSync(USERS_FILE, JSON.stringify(userArray, null, 2));
    } catch (err) {
        console.error('Error saving users:', err);
    }
}

// Load users on startup
loadUsers();

module.exports = {
    login(username, password) {
        const user = users.get(username);
        if (!user) {
            return { success: false, message: 'User not found' };
        }

        if (user.password !== password) {
            return { success: false, message: 'Incorrect password' };
        }

        return {
            success: true,
            user: {
                username: user.username,
                isAdmin: user.isAdmin || false,
                isMod: user.isMod || false,
                isGuest: false
            }
        };
    },

    register(username, password) {
        if (users.has(username)) {
            return { success: false, message: 'Username already exists' };
        }

        if (username.length < 3) {
            return { success: false, message: 'Username must be at least 3 characters' };
        }

        if (password.length < 4) {
            return { success: false, message: 'Password must be at least 4 characters' };
        }

        users.set(username, {
            username,
            password,
            isAdmin: false,
            isMod: false
        });

        saveUsers(); // Persist to file

        return { success: true, message: 'Account created successfully!' };
    }
};
