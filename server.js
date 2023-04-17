// server.js

const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const sequelize = require('sequelize');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

const JWT_SECRET = 'your-secret-key';
const port = process.env.PORT || 4000;

const Sequelize = new sequelize({
    dialect: 'mysql',
    host: 'localhost',
    username: 'root',
    password: '',
    database: 'messages_db',
    define: {
        timestamps: true,
        underscored: true,
    },
});

// Define the Messages model
const Messages = Sequelize.define('messages', {
    texte: sequelize.STRING,
});

// Enable CORS
app.use(cors());


// Enable JSON parsing
app.use(bodyParser.json());

// Create a new message
app.post('/messages', async (req, res) => {
    try {
        const message = await Messages.create(req.body);
        io.emit('new_message', message);
        res.json(message);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await Messages.findAll();
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a message
app.put('/messages/:id', async (req, res) => {
    try {
        const message = await Messages.findByPk(req.params.id);
        if (message) {
            message.text = req.body.text;
            await message.save();
            io.emit('updated_message', message);
            res.json(message);
        } else {
            res.status(404).json({ error: 'Message not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a message
app.delete('/messages/:id', async (req, res) => {
    try {
        const message = await Messages.findByPk(req.params.id);
        if (message) {
            await message.destroy();
            io.emit('deleted_message', message);
            res.json({ message: 'Message deleted successfully' });
        } else {
            res.status(404).json({ error: 'Message not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Authenticate the user and return a JWT token
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        // Perform the authentication
        if (username === 'admin' && password === 'admin') {
            const token = jwt.sign({ username }, JWT_SECRET);
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port${port}`);
});

// Socket.IO middleware to authenticate the user
io.use((socket, next) => {
    try {
        const token = socket.handshake.query.token;
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded.username;
        next();
    } catch (err) {
        console.error(err);
        next(new Error('Unauthorized'));
    }
});

io.engine.on('initial_headers', (headers, req) => {
    headers['Access-Control-Allow-Origin'] = 'http://localhost:8080';
    headers['Access-Control-Allow-Credentials'] = true;
});

io.engine.on('headers', (headers, req) => {
    headers['Access-Control-Allow-Origin'] = 'http://localhost:8080';
    headers['Access-Control-Allow-Credentials'] = true;
});

// Socket.IO event listener for new connections
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Broadcast a message to all connected clients
    socket.on('new_message', (message) => {
        io.emit('new_message', message);
    });

    // Broadcast an updated message to all connected clients
    socket.on('updated_message', (message) => {
        io.emit('updated_message', message);
    });

    // Broadcast a deleted message to all connected clients
    socket.on('deleted_message', (message) => {
        io.emit('deleted_message', message);
    });

    // Socket disconnection event
    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});