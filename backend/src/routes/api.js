const express = require('express');
const multer = require('multer');
const path = require('path');
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/auth');
const { router: adminRouter } = require('./admin');

// Configure multer with proper storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const router = express.Router();

// Configure multer for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../uploads/profiles'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

const uploadProfile = multer({ 
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile pictures
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Protected routes - require authentication
router.post('/upload-image', authenticateToken, upload.single('file'), fileController.handleImage); // Convert format
router.post('/compress-image', authenticateToken, upload.single('file'), fileController.compressImage); // Compress only
router.post('/restore-image', authenticateToken, upload.single('file'), fileController.restoreImage); // Restore quality
router.post('/upload-pdf', authenticateToken, upload.single('file'), fileController.handlePdf);
router.get('/jobs/:id', authenticateToken, fileController.getJob);
router.get('/my-jobs', authenticateToken, fileController.getUserJobs);

// Profile routes
router.put('/profile', authenticateToken, fileController.updateProfile);
router.put('/profile/password', authenticateToken, fileController.changePassword);
router.post('/profile/picture', authenticateToken, uploadProfile.single('profilePicture'), fileController.uploadProfilePicture);
router.post('/profile/disconnect-google', authenticateToken, fileController.disconnectGoogle);
router.delete('/profile', authenticateToken, fileController.deleteAccount);
router.delete('/clear-history', authenticateToken, fileController.clearHistory);

// User settings routes
router.put('/user/settings', authenticateToken, fileController.updateUserSettings);
router.get('/user/settings', authenticateToken, fileController.getUserSettings);
router.get('/user/export', authenticateToken, fileController.exportUserData);
router.delete('/user/account', authenticateToken, fileController.deleteAccount);

// Admin routes
router.use('/admin', adminRouter);

module.exports = router;
