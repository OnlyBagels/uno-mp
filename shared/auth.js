// Simple in-memory authentication (no database required)
const users = new Map();

// Add some default users
users.set('admin', { username: 'admin', password: 'admin', isAdmin: true, isMod: false });

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

        return { success: true, message: 'Account created successfully!' };
    }
};
