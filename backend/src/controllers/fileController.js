const conversion = require('../services/conversionService');
const { v4: uuidv4 } = require('uuid');
const path = require('node:path');
const fs = require('node:fs/promises');

// Minimal Job model using mongoose
const mongoose = require('mongoose');
const jobSchema = new mongoose.Schema({
  jobId: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String,
  status: { type: String, default: 'pending' },
  inputName: String,
  outputName: String,
  outputPath: String,
  originalSize: Number,
  compressedSize: Number,
  createdAt: { type: Date, default: Date.now }
});
const JobModel = mongoose.models.Job || mongoose.model('Job', jobSchema);
module.exports.Job = JobModel;

// Handle image conversion (format change with quality preservation)
exports.handleImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Get conversion options from request
    const format = req.body.format || 'jpeg';
    const level = req.body.level || 'maximum';
    const quality = req.body.quality ? Number.parseInt(req.body.quality) : null;

    const jobId = uuidv4();
    const originalSize = file.size;
    
    const job = await JobModel.create({
      jobId,
      userId: req.user.userId,
      type: 'image-convert',
      inputName: file.originalname,
      originalSize
    });

    // Process image with format conversion
    const fileExt = format === 'jpg' ? 'jpeg' : format;
    const outName = `converted-${Date.now()}-${path.parse(file.originalname).name}.${fileExt}`;
    const outPath = path.join(path.dirname(file.path), outName);
    
    await conversion.convertImage(file.path, outPath, { 
      format: fileExt,
      level,
      quality 
    });

    // Get converted size
    const stats = await fs.stat(outPath);
    const compressedSize = stats.size;

    // Update job
    job.status = 'completed';
    job.outputName = outName;
    job.outputPath = `/uploads/${outName}`;
    job.compressedSize = compressedSize;
    await job.save();

    // Return file info
    res.json({
      success: true,
      jobId,
      filename: outName,
      downloadUrl: `/uploads/${outName}`,
      originalSize,
      compressedSize,
      format: fileExt,
      level,
      operation: 'convert'
    });

  } catch (err) {
    console.error('Image conversion error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Handle image compression (size reduction, keeps format)
exports.compressImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const level = req.body.level || 'medium';
    const jobId = uuidv4();
    const originalSize = file.size;
    
    // Get file format
    const sharp = require('sharp');
    const metadata = await sharp(file.path).metadata();
    const originalFormat = metadata.format;
    
    // Get size estimate
    const estimate = await conversion.estimateCompressedSize(file.path, { 
      level, 
      format: originalFormat 
    });
    
    const job = await JobModel.create({
      jobId,
      userId: req.user.userId,
      type: 'image-compress',
      inputName: file.originalname,
      originalSize
    });

    // Compress image
    const fileExt = originalFormat === 'jpg' ? 'jpeg' : originalFormat;
    const outName = `compressed-${Date.now()}-${path.parse(file.originalname).name}.${fileExt}`;
    const outPath = path.join(path.dirname(file.path), outName);
    
    const result = await conversion.compressImage(file.path, outPath, { level });

    // Get actual compressed size
    const stats = await fs.stat(outPath);
    const compressedSize = stats.size;

    // Update job
    job.status = 'completed';
    job.outputName = outName;
    job.outputPath = `/uploads/${outName}`;
    job.compressedSize = compressedSize;
    await job.save();

    // Calculate accuracy
    const actualReduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    const estimateAccuracy = Math.abs(estimate.estimatedSize - compressedSize) / estimate.estimatedSize * 100;
    const accuracyPercent = Math.max(0, 100 - estimateAccuracy).toFixed(1);

    // Return file info with estimation data
    res.json({
      success: true,
      jobId,
      filename: outName,
      downloadUrl: `/uploads/${outName}`,
      originalSize,
      compressedSize,
      estimatedSize: estimate.estimatedSize,
      estimatedReduction: estimate.estimatedReduction,
      actualReduction,
      accuracyPercent,
      format: result.format,
      level,
      operation: 'compress'
    });

  } catch (err) {
    console.error('Image compression error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Handle image restoration (reverse compression)
exports.restoreImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const level = req.body.level || 'restore';
    const jobId = uuidv4();
    const originalSize = file.size;
    
    const job = await JobModel.create({
      jobId,
      userId: req.user.userId,
      type: 'image-restore',
      inputName: file.originalname,
      originalSize
    });

    // Restore image quality
    const sharp = require('sharp');
    const metadata = await sharp(file.path).metadata();
    const fileExt = metadata.format === 'jpg' ? 'jpeg' : metadata.format;
    const outName = `restored-${Date.now()}-${path.parse(file.originalname).name}.${fileExt}`;
    const outPath = path.join(path.dirname(file.path), outName);
    
    await conversion.restoreImage(file.path, outPath, { level });

    // Get restored size
    const stats = await fs.stat(outPath);
    const restoredSize = stats.size;

    // Update job
    job.status = 'completed';
    job.outputName = outName;
    job.outputPath = `/uploads/${outName}`;
    job.compressedSize = restoredSize;
    await job.save();

    // Return file info
    res.json({
      success: true,
      jobId,
      filename: outName,
      downloadUrl: `/uploads/${outName}`,
      originalSize,
      compressedSize: restoredSize,
      level,
      operation: 'restore'
    });

  } catch (err) {
    console.error('Image restoration error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.handlePdf = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const level = req.body.level || 'medium';
    const jobId = uuidv4();
    const originalSize = file.size;

    const job = await JobModel.create({
      jobId,
      userId: req.user.userId,
      type: 'pdf',
      inputName: file.originalname,
      originalSize
    });

    const outName = `compressed-${Date.now()}-${path.parse(file.originalname).name}.pdf`;
    const outPath = path.join(path.dirname(file.path), outName);
    
    await conversion.compressPdf(file.path, outPath, { level });

    // Get compressed size
    const stats = await fs.stat(outPath);
    const compressedSize = stats.size;

    job.status = 'completed';
    job.outputName = outName;
    job.outputPath = `/uploads/${outName}`;
    job.compressedSize = compressedSize;
    await job.save();

    // Return file info instead of sending buffer
    res.json({
      success: true,
      jobId,
      filename: outName,
      downloadUrl: `/uploads/${outName}`,
      originalSize,
      compressedSize,
      level
    });

  } catch (err) {
    console.error('PDF processing error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getJob = async (req, res) => {
  try {
    const job = await JobModel.findOne({ 
      jobId: req.params.id,
      userId: req.user.userId 
    });
    
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserJobs = async (req, res) => {
  try {
    const jobs = await JobModel.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Profile Management
const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!username && !email) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Check if email already exists
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateFields.email = email;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      return res.status(400).json({ message: 'Cannot change password for OAuth accounts' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.userId;
    
    // Get old profile picture
    const user = await User.findById(userId);
    const oldPicture = user.profilePicture;

    // Update user with new profile picture path
    const profilePicturePath = `/uploads/profiles/${file.filename}`;
    user.profilePicture = profilePicturePath;
    await user.save();

    // Delete old profile picture if exists
    if (oldPicture) {
      const oldPath = path.join(__dirname, '../../../', oldPicture);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        console.error('Error deleting old profile picture:', err);
      }
    }

    res.json({ 
      message: 'Profile picture updated successfully', 
      profilePicture: profilePicturePath 
    });
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).json({ message: 'Failed to upload profile picture' });
  }
};

exports.disconnectGoogle = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a password (can't disconnect if no password set)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Please set a password before disconnecting Google account' 
      });
    }

    user.googleId = undefined;
    await user.save();

    res.json({ message: 'Google account disconnected successfully' });
  } catch (err) {
    console.error('Disconnect Google error:', err);
    res.status(500).json({ message: 'Failed to disconnect Google account' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete user's jobs
    await JobModel.deleteMany({ userId });

    // Delete user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete profile picture if exists
    if (user.profilePicture) {
      const picturePath = path.join(__dirname, '../../../', user.profilePicture);
      try {
        await fs.unlink(picturePath);
      } catch (err) {
        console.error('Error deleting profile picture:', err);
      }
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    await JobModel.deleteMany({ userId });
    res.json({ message: 'History cleared successfully' });
  } catch (err) {
    console.error('Clear history error:', err);
    res.status(500).json({ message: 'Failed to clear history' });
  }
};

// Update user settings
exports.updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { defaultQuality, autoDownload, keepOriginal, emailNotifications, compressionAlerts } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update settings
    if (!user.settings) {
      user.settings = {};
    }

    user.settings = {
      defaultQuality: defaultQuality || user.settings.defaultQuality || 'medium',
      autoDownload: autoDownload === undefined ? user.settings.autoDownload : autoDownload,
      keepOriginal: keepOriginal === undefined ? user.settings.keepOriginal : keepOriginal,
      emailNotifications: emailNotifications === undefined ? user.settings.emailNotifications : emailNotifications,
      compressionAlerts: compressionAlerts === undefined ? user.settings.compressionAlerts : compressionAlerts
    };

    await user.save();

    res.json({ 
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

// Get user settings
exports.getUserSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      settings: user.settings || {
        defaultQuality: 'medium',
        autoDownload: false,
        keepOriginal: true,
        emailNotifications: true,
        compressionAlerts: true
      }
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ message: 'Failed to get settings' });
  }
};

// Export user data
exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user data
    const user = await User.findById(userId).select('-password');
    const jobs = await JobModel.find({ userId });

    const exportData = {
      user: {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        settings: user.settings
      },
      history: jobs.map(job => ({
        type: job.type,
        inputName: job.inputName,
        originalSize: job.originalSize,
        compressedSize: job.compressedSize,
        createdAt: job.createdAt,
        status: job.status
      })),
      exportDate: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="filecompressor-data-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error('Export data error:', err);
    res.status(500).json({ message: 'Failed to export data' });
  }
};
