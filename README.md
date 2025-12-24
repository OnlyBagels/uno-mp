# UNO Card Game - Networked Multiplayer

A real-time multiplayer UNO card game for 2-10 players. Players can join from different computers on the same network!

## Features

- **Real-time Multiplayer**: Play with 2-10 players from different computers
- **Room System**: Create or join games using room codes
- **Full UNO Rules**: All special cards (Skip, Reverse, Draw Two, Wild, Wild Draw Four)
- **Clean Modern UI**: Beautiful gradient design with smooth animations
- **UNO Call System**: Don't forget to call UNO when you have one card left!

## Setup Instructions

### 1. Install Node.js
If you don't have Node.js installed, download it from https://nodejs.org/

### 2. Install Dependencies
Open a terminal/command prompt in the game folder and run:
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

The server will start on port 3000. You'll see:
```
Server running on port 3000
Players can connect at http://localhost:3000
Or from other computers at http://YOUR_LOCAL_IP:3000
```

### 4. Find Your Local IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (usually something like 192.168.1.X)

**Mac/Linux:**
```bash
ifconfig
```
Look for "inet" under your network interface (usually something like 192.168.1.X)

### 5. Connect Players

**Host computer:**
- Open browser and go to `http://localhost:3000`

**Other players on the network:**
- Open browser and go to `http://YOUR_LOCAL_IP:3000` (replace with actual IP from step 4)
- Example: `http://192.168.1.100:3000`

## How to Play

### Starting a Game

1. **First Player (Host):**
   - Enter your name
   - Select max number of players
   - Click "Create Game"
   - Share the room code with other players

2. **Other Players:**
   - Enter your name
   - Enter the room code shared by the host
   - Click "Join Game"

3. **Start Playing:**
   - Once all players have joined, the host clicks "Start Game"
   - Players take turns playing cards

### Game Rules

- Match cards by **color** or **number**
- **Special Cards:**
  - **Skip**: Next player loses their turn
  - **Reverse**: Reverses the direction of play
  - **Draw Two**: Next player draws 2 cards and loses their turn
  - **Wild**: Play on any card, choose the color
  - **Wild Draw Four**: Next player draws 4 cards and loses their turn

- **UNO Rule:**
  - Call "UNO" when you have 2 cards left (before playing your second-to-last card)
  - Penalty: Draw 2 cards if you forget

- **Winning:**
  - First player to play all their cards wins!

## Gameplay

- Click on a card in your hand to play it
- Click "Draw Card" if you can't play
- Click "UNO!" button when you have 2 cards left
- Wild cards will prompt you to choose a color

## Troubleshooting

**Can't connect from another computer?**
- Make sure all computers are on the same WiFi network
- Check your firewall settings (may need to allow port 3000)
- Verify you're using the correct IP address

**Game crashes or disconnects?**
- Refresh the page to reconnect
- If a player leaves, the game continues with remaining players

**Port 3000 already in use?**
- Edit server.js and change the PORT variable to another number (e.g., 3001)

## Technologies Used

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: HTML5, CSS3, JavaScript
- **Real-time Communication**: WebSocket (via Socket.io)

## File Structure

```
IDK bro/
├── server.js          # Server-side game logic
├── client.js          # Client-side UI and networking
├── index.html         # Game interface
├── styles.css         # Game styling
├── package.json       # Dependencies
└── README.md          # This file
```

## Tips for Best Experience

- Use a stable WiFi connection
- Keep the server running while people are playing
- Don't refresh the page during a game (you'll disconnect)
- Share the room code via text/chat before starting

Enjoy playing UNO with your friends!
