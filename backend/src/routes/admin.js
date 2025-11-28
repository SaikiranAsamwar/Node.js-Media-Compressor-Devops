const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const JobModel = require('../controllers/fileController').Job;

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  User.findById(req.user.userId).then(user => {
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  }).catch(err => {
    res.status(500).json({ message: 'Error checking admin status' });
  });
};

// Get all users
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .limit(100)
      .sort({ createdAt: -1 });

    // Add file count for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const filesCount = await JobModel.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          filesProcessed: filesCount,
          active: true // This would check last login time in production
        };
      })
    );

    res.json(usersWithStats);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get system statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalJobs = await JobModel.countDocuments({});
    
    const jobs = await JobModel.find({});
    const totalStorageUsed = jobs.reduce((sum, job) => sum + job.compressedSize, 0);
    
    const avgProcessingTime = jobs.length > 0
      ? jobs.reduce((sum, job) => sum + (job.processingTime || 500), 0) / jobs.length
      : 500;

    // Calculate growth metrics
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: oneMonthAgo } });
    const newJobs = await JobModel.countDocuments({ createdAt: { $gte: oneMonthAgo } });

    const userGrowth = totalUsers > 0 ? Math.round((newUsers / totalUsers) * 100) : 0;
    const fileGrowth = totalJobs > 0 ? Math.round((newJobs / totalJobs) * 100) : 0;

    res.json({
      totalUsers,
      totalFilesProcessed: totalJobs,
      totalStorageUsed,
      avgProcessingTime,
      userGrowth,
      fileGrowth,
      storageGrowth: 15
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Get activity logs
router.get('/activity', authenticateToken, isAdmin, async (req, res) => {
  try {
    const jobs = await JobModel.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'username email');

    const activity = jobs.map(job => ({
      type: job.type,
      username: job.userId?.username || 'Unknown',
      fileName: job.inputName,
      status: job.status,
      timestamp: job.createdAt
    }));

    res.json(activity);
  } catch (err) {
    console.error('Error fetching activity:', err);
    res.status(500).json({ message: 'Failed to fetch activity' });
  }
});

// Ban/unban user
router.put('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { banned } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { banned },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user (admin)
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await JobModel.deleteMany({ userId: req.params.id });
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

module.exports = { router, isAdmin };
