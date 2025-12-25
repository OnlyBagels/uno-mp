// File-based authentication for persistence on Render
const fs = require('fs');
const path = require('path');
const { isUsernameBlacklisted, getBlacklistErrorMessage } = require('./username-blacklist');

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

        // Check username against blacklist
        if (isUsernameBlacklisted(username)) {
            return { success: false, message: getBlacklistErrorMessage() };
        }

        users.set(username, {
            username,
            password,
            isAdmin: false,
            isMod: false
        });

        saveUsers(); // Persist to file

        return { success: true, message: 'Account created successfully!' };
    },

    // Register or get OAuth user (Discord/Google)
    registerOAuthUser(profile, provider) {
        const username = profile.username || profile.displayName;
        const providerId = provider === 'discord' ? profile.discordId : profile.googleId;
        const lookupKey = `${provider}_${providerId}`;

        // Check if OAuth user already exists
        let existingUser = null;
        for (const [key, user] of users.entries()) {
            if (user[`${provider}Id`] === providerId) {
                existingUser = user;
                break;
            }
        }

        if (existingUser) {
            // User already registered via this OAuth provider
            return {
                success: true,
                user: existingUser,
                isNewUser: false
            };
        }

        // Check username against blacklist for new OAuth users
        if (isUsernameBlacklisted(username)) {
            return {
                success: false,
                message: getBlacklistErrorMessage()
            };
        }

        // Create new OAuth user
        const newUser = {
            username,
            [`${provider}Id`]: providerId,
            avatar: profile.avatar,
            email: profile.email || null,
            isAdmin: false,
            isMod: false,
            isGuest: false,
            [`is${provider.charAt(0).toUpperCase() + provider.slice(1)}`]: true,
            oauthProvider: provider
        };

        // Use OAuth ID as the key to prevent conflicts
        users.set(lookupKey, newUser);
        saveUsers();

        return {
            success: true,
            user: newUser,
            isNewUser: true
        };
    },

    // Get OAuth user by provider ID
    getOAuthUser(providerId, provider) {
        const lookupKey = `${provider}_${providerId}`;
        return users.get(lookupKey);
    },

    // Get all users for syncing to leaderboard
    getAllUsers() {
        return Array.from(users.entries());
    }
};
