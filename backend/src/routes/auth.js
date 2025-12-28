// ============================================
// AUTHENTICATION ROUTES - BACKEND
// ============================================

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const passport = require('passport');
require('../config/passport');

const router = express.Router();

// ============================================
// SIGNUP ROUTE
// ============================================
router.post('/signup', [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  console.log('\n→ POST /auth/signup');
  
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors.array().map(err => err.msg).join(', ');
      console.log('✗ Validation failed:', errorMessage);
      return res.status(400).json({ error: errorMessage });
    }

    const { username, email, password } = req.body;
    console.log('  Username:', username);
    console.log('  Email:', email);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      console.log(`✗ User already exists with this ${field}`);
      return res.status(400).json({ 
        error: `User already exists with this ${field}` 
      });
    }

    // Create new user
    console.log('  Creating new user...');
    const user = await User.create({ 
      username, 
      email, 
      password 
    });

    // Generate JWT token
    const token = generateToken(user._id);
    console.log('  Token generated ✓');

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // Send response
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    console.log('✓ Signup successful for:', username);
    
    res.status(201).json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('✗ Signup error:', error.message);
    res.status(500).json({ 
      error: 'Registration failed. Please try again.' 
    });
  }
});

// ============================================
// LOGIN ROUTE
// ============================================
router.post('/login', [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required')
], async (req, res) => {
  console.log('\n→ POST /auth/login');
  
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessage = errors.array().map(err => err.msg).join(', ');
      console.log('✗ Validation failed:', errorMessage);
      return res.status(400).json({ error: errorMessage });
    }

    const { email, password } = req.body;
    console.log('  Email:', email);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('✗ User not found');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('✗ Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user._id);
    console.log('  Token generated ✓');

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // Send response
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    console.log('✓ Login successful for:', user.username);
    
    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('✗ Login error:', error.message);
    res.status(500).json({ 
      error: 'Login failed. Please try again.' 
    });
  }
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', async (req, res) => {
  console.log('\n→ GET /auth/me');
  
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.token || 
                  req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
      console.log('✗ No token provided');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('  Token received ✓');

    // Verify token
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('  Token valid, userId:', decoded.userId);
    } catch (error) {
      console.log('✗ Invalid token:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('✗ User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✓ User authenticated:', user.username);
    res.json(user);

  } catch (error) {
    console.error('✗ Auth error:', error.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// ============================================
// LOGOUT ROUTE
// ============================================
router.post('/logout', (req, res) => {
  console.log('\n→ POST /auth/logout');
  res.clearCookie('token');
  console.log('✓ User logged out');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================
// GOOGLE OAUTH
// ============================================
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }), 
  (req, res) => {
    try {
      const token = generateToken(req.user._id);
      
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      res.redirect(`http://localhost:5000/dashboard.html?token=${token}`);
    } catch (error) {
      console.error('Google OAuth error:', error);
      res.redirect('/login.html?error=oauth_failed');
    }
  }
);

module.exports = router;
