
// File: server.js const express = require('express'); const http = require('http'); const socketIo = require('socket.io'); const path = require('path');

const app = express(); const server = http.createServer(app); const io = socketIo(server, { cors: { origin: '*' } });

// Serve static files from public folder app.use(express.static(path.join(__dirname, 'public')));

let waitingPlayer = null;

io.on('connection', (socket) => { console.log('A user connected:', socket.id);

if (waitingPlayer) { const player1 = waitingPlayer; const player2 = socket; const room = player1.id + '#' + player2.id;

player1.join(room);
player2.join(room);

io.to(room).emit('startGame', { room });
waitingPlayer = null;

console.log(`Room created: ${room}`);

} else { waitingPlayer = socket; }

socket.on('clickCircle', (data) => { socket.to(data.room).emit('opponentClicked', data); });

socket.on('scoreUpdate', (data) => { socket.to(data.room).emit('opponentScore', data.score); });

socket.on('chat', ({ room, message }) => { socket.to(room).emit('chat', { message }); });

socket.on('disconnect', () => { console.log('User disconnected:', socket.id); if (waitingPlayer && waitingPlayer.id === socket.id) { waitingPlayer = null; } }); });

const PORT = process.env.PORT || 300

