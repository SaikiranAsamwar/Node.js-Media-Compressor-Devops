const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('node:path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('node:fs');
const session = require('express-session');
const passport = require('passport');
const socketIo = require('socket.io');

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const metrics = require('./metrics');

const app = express();

// CORS configuration
const allowedOrigins = new Set([
  'http://localhost:5000', 'http://127.0.0.1:5000', 
  'http://localhost:8080', 'http://127.0.0.1:8080',
  process.env.FRONTEND_URL
].filter(Boolean));

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, etc)
    if (!origin) return callback(null, true);
    // Check if origin is in allowed list
    if (allowedOrigins.has(origin)) return callback(null, true);
    // For production, allow any origin that ends with the domain
    if (process.env.NODE_ENV === 'production' && origin.includes('.amazonaws.com')) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all origins in development
  },
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
const profilesDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
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

// Clean URL routing - remove .html extension
const pages = ['dashboard', 'converter', 'history', 'pricing', 'profile', 'settings', 'admin', 'login', 'signup'];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend', `${page}.html`));
  });
});

// Catch-all route for SPA - serve index.html for any other route
app.get('*', (req, res) => {
  // Don't serve index.html for API routes or file extensions
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.includes('.')) {
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

// MongoDB connection with better error handling
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/filetool';
try {
  await mongoose.connect(MONGO, {
    serverSelectionTimeoutMS: 5000
  });
  console.log('MongoDB connected successfully');
} catch (err) {
  console.warn('MongoDB connection failed:', err.message);
  console.log('App will run without database features');
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Socket.io for real-time features
const io = socketIo(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, etc)
      if (!origin) return callback(null, true);
      // Check if origin is in allowed list
      if (allowedOrigins.has(origin)) return callback(null, true);
      // For production, allow any origin that ends with the domain
      if (process.env.NODE_ENV === 'production' && origin.includes('.amazonaws.com')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow all origins in development
    },
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
