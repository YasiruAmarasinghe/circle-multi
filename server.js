const express = require('express');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Home route (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Game room management
let waitingPlayer = null;
let gameRooms = {};

io.on('connection', socket => {
  console.log('New client connected:', socket.id);

  if (waitingPlayer === null) {
    waitingPlayer = socket;
    socket.emit('status', 'Waiting for an opponent...');
  } else {
    // Create a room and pair players
    const roomID = `${waitingPlayer.id}#${socket.id}`;
    gameRooms[roomID] = {
      players: [waitingPlayer, socket],
      scores: {
        [waitingPlayer.id]: 0,
        [socket.id]: 0
      }
    };

    waitingPlayer.join(roomID);
    socket.join(roomID);

    // Notify both players
    waitingPlayer.emit('startGame', { room: roomID });
    socket.emit('startGame', { room: roomID });

    // Clear waiting player
    waitingPlayer = null;
  }

  // Handle circle click
  socket.on('clickCircle', ({ room, x }) => {
    socket.to(room).emit('opponentClicked', { x });
  });

  // Handle score updates
  socket.on('scoreUpdate', ({ room, score }) => {
    const players = gameRooms[room]?.players;
    if (players) {
      gameRooms[room].scores[socket.id] = score;
      socket.to(room).emit('opponentScore', score);
    }
  });

  // Handle chat messages
  socket.on('chat', ({ room, message }) => {
    socket.to(room).emit('chat', { message });
  });

  // Rematch
  socket.on('rematch', ({ room }) => {
    io.in(room).emit('rematch');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Remove from waiting
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    // Remove from active rooms
    for (const room in gameRooms) {
      const players = gameRooms[room].players;
      if (players.some(p => p.id === socket.id)) {
        // Notify opponent
        players.forEach(p => {
          if (p.id !== socket.id) {
            p.emit('opponentDisconnected');
          }
        });
        delete gameRooms[room];
        break;
      }
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
