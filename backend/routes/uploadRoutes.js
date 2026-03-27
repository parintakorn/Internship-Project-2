const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const adminAuth = require('../middleware/adminAuth');

// ตั้งค่า multer สำหรับแบนเนอร์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/images/banners');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `banner_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('เฉพาะไฟล์รูปภาพเท่านั้น!'));
    }
  }
});

// POST /api/upload - อัปโหลดรูปภาพแบนเนอร์ (Admin only)
router.post('/', adminAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'กรุณาเลือกไฟล์รูปภาพ' 
      });
    }

    // สร้าง URL ที่ใช้ได้ทั้ง localhost และ IP
    const host = req.get('host'); // จะได้ 192.168.1.113:3000 หรือ localhost:3000
    const protocol = req.protocol; // http หรือ https
    const imageUrl = `${protocol}://${host}/images/banners/${req.file.filename}`;
    
    console.log('✅ Banner image uploaded:', req.file.filename);
    console.log('📍 Image URL:', imageUrl);
    
    res.json({
      success: true,
      message: 'อัปโหลดรูปภาพสำเร็จ',
      filename: req.file.filename,
      imageUrl: imageUrl,
      url: imageUrl,
      path: imageUrl
    });
    
  } catch (err) {
    console.error('❌ Upload error:', err);
    
    // ลบไฟล์ถ้าเกิด error
    if (req.file) {
      const filePath = path.join(__dirname, '../public/images/banners', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'อัปโหลดไม่สำเร็จ', 
      error: err.message 
    });
  }
});

module.exports = router;