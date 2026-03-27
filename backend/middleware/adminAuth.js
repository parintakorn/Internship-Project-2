const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    /* =========================
       1️⃣ ตรวจ Authorization
    ========================= */
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'ไม่มี token' });
    }

    const token = authHeader.split(' ')[1];

    /* =========================
       2️⃣ Verify Token
    ========================= */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT payload:', decoded);  // ← เพิ่ม log เพื่อดู payload จริง

    // รองรับหลายรูปแบบ แต่ให้ id มาก่อน (เพราะ token ใหม่มี id เป็นหลัก)
    const userId = decoded.id || decoded.user_id || decoded.userId;

    console.log('Extracted userId from token:', userId);  // ← log ว่าได้ userId เท่าไหร่

    if (!userId) {
      return res.status(401).json({ message: 'Token ไม่มี user_id หรือ id' });
    }

    /* =========================
       3️⃣ ดึง user จาก DB
    ========================= */
    const result = await pool.query(
      'SELECT user_id, email, name, role FROM users WHERE user_id = $1',
      [userId]
    );

    console.log('Query result rows length:', result.rows.length);  // ← log ว่าเจอหรือไม่
    if (result.rows.length === 0) {
      console.log('User not found for userId:', userId);
      return res.status(401).json({ message: 'ไม่พบผู้ใช้' });
    }

    const user = result.rows[0];
    console.log('Found admin user:', user.email, user.role);  // ← log เมื่อเจอ

    /* =========================
       4️⃣ ตรวจสิทธิ์ Admin
    ========================= */
    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'ไม่มีสิทธิ์เข้าถึง (Admin เท่านั้น)'
      });
    }

    /* =========================
       5️⃣ ผ่านทุกอย่าง
    ========================= */
    req.user = user;
    next();

  } catch (error) {
    console.error('❌ Admin auth error:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token หมดอายุ' });
    }

    return res.status(500).json({
      message: 'เกิดข้อผิดพลาดในระบบ',
      error: error.message
    });
  }
};

module.exports = adminAuth;
