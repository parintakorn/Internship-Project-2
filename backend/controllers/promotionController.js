// controllers/promotionController.js
const pool = require('../config/database');

exports.getAllPromotions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotions ORDER BY promotion_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching promotions:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงโปรโมชั่น' });
  }
};