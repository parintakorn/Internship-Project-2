const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const { uploadSlips } = require('../middleware/upload'); // import เฉพาะ uploadSlips

// QR Code
router.get('/:orderId/qrcode', authMiddleware, paymentController.generateQRCode);

// Upload Slip - ใช้ uploadSlips ที่กำหนด destination เป็น slips
router.post('/:orderId/upload-slip', authMiddleware, uploadSlips.single('slip'), paymentController.uploadSlip);

module.exports = router;