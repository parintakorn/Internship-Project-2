const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, // ✅ เพิ่ม success
        message: 'ไม่มี token' 
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key'); // ✅ เพิ่ม fallback

    console.log('🔑 Token decoded:', decoded);

    const result = await pool.query(
      'SELECT user_id, email, name, phone, role FROM users WHERE user_id = $1',
      [decoded.user_id || decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'ไม่พบผู้ใช้' 
      });
    }

    req.user = result.rows[0];
    req.userId = result.rows[0].user_id;

    console.log('✅ User authenticated:', req.userId);

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: error.message 
    });
  }
};

module.exports = authMiddleware;