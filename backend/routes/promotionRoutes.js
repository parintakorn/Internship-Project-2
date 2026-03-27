// routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// GET /api/promotions - ดึงโปรโมชั่นทั้งหมดพร้อมชื่อสินค้า
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.promotion_id,
        p.name,
        p.discount_type,
        p.discount_value,
        p.start_date,
        p.end_date,
        p.product_id,
        p.created_at,
        pr.name as product_name,
        p.discount_value as discount_percentage
      FROM promotions p
      LEFT JOIN products pr ON p.product_id = pr.product_id
      ORDER BY p.created_at DESC
    `);
    
    res.json(result.rows || []);
  } catch (err) {
    console.error('GET promotions FAILED:', err.message);
    console.error('Full error:', err.stack);
    res.status(500).json({ 
      message: 'ดึงโปรโมชั่นไม่สำเร็จ',
      error: err.message
    });
  }
});

// POST /api/promotions - เพิ่มโปรโมชั่นใหม่ (เฉพาะ admin)
router.post('/', authMiddleware, adminAuth, async (req, res) => {
  const { name, discount_type, discount_value, start_date, end_date, product_id } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({ message: 'ต้องระบุชื่อโปรโมชั่น' });
  }
  if (!discount_type || !['percent', 'fixed'].includes(discount_type)) {
    return res.status(400).json({ message: 'discount_type ต้องเป็น percent หรือ fixed' });
  }
  if (!discount_value || discount_value <= 0) {
    return res.status(400).json({ message: 'discount_value ต้องมากกว่า 0' });
  }
  if (!product_id) {
    return res.status(400).json({ message: 'ต้องระบุสินค้าที่ใช้โปรโมชั่น' });
  }

  try {
    // เช็คว่าสินค้ามีจริง
    const productCheck = await pool.query(
      'SELECT product_id FROM products WHERE product_id = $1',
      [product_id]
    );

    if (productCheck.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบสินค้า ID นี้' });
    }

    const result = await pool.query(
      `INSERT INTO promotions 
       (name, discount_type, discount_value, start_date, end_date, product_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name,
        discount_type,
        discount_value,
        start_date || null,
        end_date || null,
        product_id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating promotion:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ 
      message: 'เพิ่มโปรโมชั่นไม่สำเร็จ',
      error: err.message,
      detail: err.detail || 'ตรวจสอบข้อมูลที่ส่งมา'
    });
  }
});

// PUT /api/promotions/:id - แก้ไขโปรโมชั่น (เฉพาะ admin)
router.put('/:id', authMiddleware, adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, discount_type, discount_value, start_date, end_date, product_id } = req.body;

  try {
    // เช็คว่าโปรโมชั่นมีจริง
    const promoCheck = await pool.query(
      'SELECT promotion_id FROM promotions WHERE promotion_id = $1',
      [id]
    );

    if (promoCheck.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบโปรโมชั่น ID นี้' });
    }

    // เช็คว่าสินค้ามีจริง (ถ้ามีการส่ง product_id มา)
    if (product_id) {
      const productCheck = await pool.query(
        'SELECT product_id FROM products WHERE product_id = $1',
        [product_id]
      );

      if (productCheck.rowCount === 0) {
        return res.status(404).json({ message: 'ไม่พบสินค้า ID นี้' });
      }
    }

    const result = await pool.query(
      `UPDATE promotions 
       SET name = $1, 
           discount_type = $2, 
           discount_value = $3, 
           start_date = $4, 
           end_date = $5, 
           product_id = $6
       WHERE promotion_id = $7 
       RETURNING *`,
      [
        name,
        discount_type,
        discount_value,
        start_date || null,
        end_date || null,
        product_id,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update promotion error:', err.message);
    console.error('Full error:', err);
    res.status(500).json({ 
      message: 'อัปเดตโปรโมชั่นไม่สำเร็จ',
      error: err.message 
    });
  }
});

// DELETE /api/promotions/:id - ลบโปรโมชั่น (เฉพาะ admin)
router.delete('/:id', authMiddleware, adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`Admin ${req.user?.email || 'unknown'} ลบโปรโมชั่น ID: ${id}`);

    const result = await pool.query(
      'DELETE FROM promotions WHERE promotion_id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'ไม่พบโปรโมชั่น ID นี้' });
    }

    res.json({ 
      message: 'ลบโปรโมชั่นสำเร็จ',
      deleted: result.rows[0]
    });
  } catch (err) {
    console.error('DELETE promotion error:', err.message);
    res.status(500).json({ 
      message: 'ลบโปรโมชั่นไม่สำเร็จ',
      error: err.message 
    });
  }
});

module.exports = router;