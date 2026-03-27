const express = require('express');
const router = express.Router();
const db = require('../config/database');
const adminAuth = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// GET /api/banners - ดึงแบนเนอร์ที่เปิดใช้งาน (Public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM promotion_banners WHERE is_active = true ORDER BY display_order ASC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching banners:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบนเนอร์' 
    });
  }
});

// GET /api/banners/admin/all - ดึงแบนเนอร์ทั้งหมดสำหรับ Admin
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM promotion_banners ORDER BY display_order ASC, created_at DESC'
    );
    
    console.log('✅ Fetched all banners for admin:', result.rows.length);
    
    res.json({
      success: true,
      banners: result.rows
    });
  } catch (error) {
    console.error('❌ Error fetching admin banners:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบนเนอร์',
      error: error.message 
    });
  }
});

// POST /api/banners/admin - เพิ่มแบนเนอร์ใหม่ (Admin only)
router.post('/admin', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, link_url, display_order, is_active } = req.body;

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'กรุณาเลือกรูปภาพ' 
      });
    }

    // สร้าง URL สำหรับรูปภาพ
    const image_url = `/images/banners/${req.file.filename}`;

    const result = await db.query(
      `INSERT INTO promotion_banners 
       (title, image_url, link_url, display_order, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING *`,
      [
        title || 'แบนเนอร์โปรโมชั่น',
        image_url,
        link_url || null,
        display_order || 0,
        is_active === 'true' || is_active === true
      ]
    );

    console.log('✅ Banner created:', result.rows[0]);
    
    res.status(201).json({
      success: true,
      message: 'เพิ่มแบนเนอร์สำเร็จ',
      banner: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating banner:', error);
    
    // ลบไฟล์ถ้าเกิด error
    if (req.file) {
      const filePath = path.join(__dirname, '../public/images/banners', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการเพิ่มแบนเนอร์',
      error: error.message 
    });
  }
});

// PUT /api/banners/admin/:id - แก้ไขแบนเนอร์ (Admin only)
router.put('/admin/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, link_url, display_order, is_active } = req.body;

    // ตรวจสอบว่าแบนเนอร์มีอยู่หรือไม่
    const existing = await db.query(
      'SELECT * FROM promotion_banners WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบแบนเนอร์' 
      });
    }

    let image_url = existing.rows[0].image_url;

    // ถ้ามีรูปใหม่
    if (req.file) {
      // ลบรูปเก่า
      const oldImagePath = path.join(__dirname, '../public', existing.rows[0].image_url);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      image_url = `/images/banners/${req.file.filename}`;
    }

    const result = await db.query(
      `UPDATE promotion_banners 
       SET title = $1, 
           image_url = $2, 
           link_url = $3,
           display_order = $4, 
           is_active = $5,
           updated_at = NOW() 
       WHERE id = $6 
       RETURNING *`,
      [
        title || existing.rows[0].title,
        image_url,
        link_url !== undefined ? link_url : existing.rows[0].link_url,
        display_order !== undefined ? display_order : existing.rows[0].display_order,
        is_active === 'true' || is_active === true,
        req.params.id
      ]
    );

    console.log('✅ Banner updated:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'แก้ไขแบนเนอร์สำเร็จ',
      banner: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating banner:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการแก้ไขแบนเนอร์',
      error: error.message 
    });
  }
});

// DELETE /api/banners/admin/:id - ลบแบนเนอร์ (Admin only)
router.delete('/admin/:id', adminAuth, async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT * FROM promotion_banners WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบแบนเนอร์' 
      });
    }

    // ลบรูป
    const imagePath = path.join(__dirname, '../public', existing.rows[0].image_url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await db.query('DELETE FROM promotion_banners WHERE id = $1', [req.params.id]);

    console.log('✅ Banner deleted:', req.params.id);
    
    res.json({
      success: true,
      message: 'ลบแบนเนอร์สำเร็จ'
    });
  } catch (error) {
    console.error('❌ Error deleting banner:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบแบนเนอร์',
      error: error.message 
    });
  }
});

module.exports = router;