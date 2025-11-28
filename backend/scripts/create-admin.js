#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../src/models/User');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/filetool';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
};

async function createAdminAccount() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO);
    console.log('Connected to MongoDB\n');

    // Get admin credentials
    console.log('=== Create Admin Account ===\n');
    
    const username = await question('Admin Username: ');
    const email = await question('Admin Email: ');
    const password = await question('Admin Password (min 6 chars): ');
    const confirmPassword = await question('Confirm Password: ');

    // Validate input
    if (!username || !email || !password) {
      console.error('Error: All fields are required');
      process.exit(1);
    }

    if (username.length < 3) {
      console.error('Error: Username must be at least 3 characters');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Error: Password must be at least 6 characters');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error('Error: Passwords do not match');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      console.error('Error: User with this email or username already exists');
      process.exit(1);
    }

    // Create admin user
    console.log('\nCreating admin account...');
    const adminUser = new User({
      username,
      email,
      password,
      role: 'admin'
    });

    await adminUser.save();

    console.log('\n✅ Admin account created successfully!\n');
    console.log('Admin Details:');
    console.log(`  Username: ${username}`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: admin`);
    console.log(`\nYou can now login with these credentials at http://localhost:3000/login.html`);

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin account:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

createAdminAccount();
