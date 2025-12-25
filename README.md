# 🎮 Party Games Hub

A multiplayer party games platform featuring two exciting card games with shared authentication and real-time gameplay!

## 🎯 Games Included

### 🃏 WildCard
Fast-paced card game with special mechanics:
- Card stacking (+2 on +2, +4 on +4)
- LAST CARD calling system with penalties
- Catch mechanic to call out rule violations
- Emoji chat system
- 2-10 players
- 10-20 minute games

### 😈 Awful Answers (18+)
Adult party card game inspired by Cards Against Humanity:
- Card Czar rotation system
- Fill-in-the-blank prompts with hilarious answers
- 200+ cards included
- Anonymous answer judging
- First to 7 points wins
- 4-20 players
- 30-90 minute games

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Running the Server
```bash
npm start
```

The hub will be available at `http://localhost:3000`

### Development Mode
```bash
npm run dev
```

## 🎮 How to Play

### Getting Started
1. Visit the homepage
2. **Register** an account, **Login**, or play as **Guest**
3. Choose your game: **WildCard** or **Awful Answers**
4. Create a room or join with a room code
5. Invite friends by sharing the room code!

### WildCard Rules
- Match cards by color or number
- Stack draw cards to pass them to the next player
- Call "LAST CARD" when you have 2 cards left
- Other players can "Catch" you if you forget!
- First player to empty their hand wins

### Awful Answers Rules
- One player is the **Card Czar** each round
- Card Czar reads a **Black Card** (prompt)
- Other players submit their funniest **White Card(s)** (answers)
- Card Czar picks the funniest answer
- Winner gets 1 Awesome Point
- First to 7 points wins the game!

## 📁 Project Structure

```
party-games-hub/
├── public/              # Homepage and game hub
│   ├── index.html       # Main landing page
│   ├── client.js        # Hub client logic
│   └── styles.css       # Hub styling
├── wildcard/            # WildCard game
│   ├── index.html       # Game UI
│   ├── client.js        # Client-side game logic
│   ├── game.js          # Game rules and mechanics
│   ├── wildcard-server.js # Server handlers (legacy)
│   └── styles.css       # Game styling
├── awful-answers/       # Awful Answers game
│   ├── index.html       # Game UI
│   ├── client.js        # Client-side game logic
│   ├── game.js          # Game logic (Card Czar, voting)
│   ├── server.js        # Server handlers
│   ├── cards.js         # Card database (50+ prompts, 200+ answers)
│   └── styles.css       # Game styling
├── shared/              # Shared resources
│   ├── auth.js          # Authentication system
│   └── database.js      # Database utilities
├── server.js            # Main server (routing and auth)
└── package.json         # Dependencies
```

## 🔧 Technical Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: In-memory user system
- **Real-time**: WebSocket communication via Socket.io

## 🌟 Features

### Shared Features
- ✅ Unified authentication system
- ✅ Guest play (no account required)
- ✅ Room code system with optional passwords
- ✅ Real-time multiplayer
- ✅ Responsive design
- ✅ Notification system
- ✅ Chat functionality (WildCard)

### WildCard Features
- ✅ Card draw stacking mechanics
- ✅ LAST CARD penalty system
- ✅ Catch button with cooldown
- ✅ Custom card colors and gradients
- ✅ Clickable deck for drawing
- ✅ Emoji picker for chat

### Awful Answers Features
- ✅ Card Czar rotation
- ✅ Anonymous answer judging
- ✅ Pick 2/Pick 3 card support
- ✅ Score tracking
- ✅ Winner celebration
- ✅ 200+ original cards

## 🎨 Customization

### WildCard
Players can customize their experience:
- Card colors (Red, Blue, Green, Yellow)
- Background gradients
- Settings persist in localStorage

## 📝 Default Login

- **Username**: `admin`
- **Password**: `admin`

Or create your own account or play as guest!

## 🤝 Multiplayer

Both games support multiple simultaneous rooms:
- Each room has a unique 4-letter code
- Optional password protection
- Host controls game start
- Players can join mid-lobby

## 🐛 Known Issues

None currently! Report issues on GitHub.

## 📄 License

MIT

## 🎉 Credits

Created with [Claude Code](https://claude.com/claude-code)

---

**Have fun and play responsibly! Remember: Awful Answers is for adults 17+ only.**
