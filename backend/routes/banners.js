const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/banners - ดึงแบนเนอร์ทั้งหมด (Public)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM promotion_banners ORDER BY display_order ASC, created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบนเนอร์' });
  }
});

// GET /api/banners/:id - ดึงแบนเนอร์ตาม ID
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM promotion_banners WHERE banner_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบแบนเนอร์' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแบนเนอร์' });
  }
});

// POST /api/banners - เพิ่มแบนเนอร์ใหม่ (Admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { image_url, display_order } = req.body;

    if (!image_url) {
      return res.status(400).json({ message: 'กรุณาระบุ URL รูปภาพ' });
    }

    // หาลำดับการแสดงผลสูงสุด
    let order = display_order;
    if (!order) {
      const maxResult = await db.query(
        'SELECT MAX(display_order) as max_order FROM promotion_banners'
      );
      order = (maxResult.rows[0]?.max_order || 0) + 1;
    }

    const result = await db.query(
      'INSERT INTO promotion_banners (image_url, display_order, created_at) VALUES ($1, $2, NOW()) RETURNING *',
      [image_url, order]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเพิ่มแบนเนอร์' });
  }
});

// PUT /api/banners/:id - แก้ไขแบนเนอร์ (Admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { image_url, display_order } = req.body;

    // ตรวจสอบว่าแบนเนอร์มีอยู่หรือไม่
    const existing = await db.query(
      'SELECT * FROM promotion_banners WHERE banner_id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบแบนเนอร์' });
    }

    const result = await db.query(
      'UPDATE promotion_banners SET image_url = $1, display_order = $2, updated_at = NOW() WHERE banner_id = $3 RETURNING *',
      [
        image_url || existing.rows[0].image_url, 
        display_order || existing.rows[0].display_order, 
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการแก้ไขแบนเนอร์' });
  }
});

// DELETE /api/banners/:id - ลบแบนเนอร์ (Admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT * FROM promotion_banners WHERE banner_id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบแบนเนอร์' });
    }

    await db.query('DELETE FROM promotion_banners WHERE banner_id = $1', [req.params.id]);

    res.json({ message: 'ลบแบนเนอร์สำเร็จ' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบแบนเนอร์' });
  }
});

module.exports = router;