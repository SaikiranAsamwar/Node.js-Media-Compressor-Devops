const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const socketIo = require('socket.io');

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const metrics = require('./metrics');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metrics.register.contentType);
  res.end(await metrics.register.metrics());
});

// MongoDB connection with better error handling
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/filetool';
mongoose.connect(MONGO, {
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch((err) => {
  console.warn('MongoDB connection failed:', err.message);
  console.log('App will run without database features');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Socket.io for real-time features
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('Admin connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Admin disconnected:', socket.id);
  });
});

// Store io for use in other parts of the app
app.io = io;

module.exports = { app, io, server };
