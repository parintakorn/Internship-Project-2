const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (ไม่ต้อง login)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Social login routes
router.post('/google', authController.googleLogin);
router.post('/facebook', authController.facebookLogin);
router.post('/line', authController.lineLogin);

// Protected routes (ต้อง login ก่อน)
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;