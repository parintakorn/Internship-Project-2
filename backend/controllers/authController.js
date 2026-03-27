const bcrypt = require('bcrypt'); // ✅ ใช้ bcrypt แทน bcryptjs
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// สร้าง JWT Token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.user_id,
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name || ''
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// ✅ Register
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'อีเมลนี้ถูกใช้งานแล้ว' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ ใช้ password แทน password_hash
    const result = await pool.query(
      `INSERT INTO users (email, password, name, phone, role, created_at) 
       VALUES ($1, $2, $3, $4, 'user', NOW()) 
       RETURNING user_id, email, name, phone, role, address, district, province, postal_code, created_at`,
      [email, hashedPassword, name || email.split('@')[0], phone || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    console.log('✅ User registered:', user.email);

    res.status(201).json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        district: user.district,
        province: user.province,
        postal_code: user.postal_code,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการลงทะเบียน',
      error: error.message 
    });
  }
};

// ✅ Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ ใช้ password แทน password_hash
    const result = await pool.query(
      `SELECT user_id, email, password, name, phone, role, 
              address, district, province, postal_code, 
              created_at 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    const user = result.rows[0];

    // ✅ ใช้ user.password แทน user.password_hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    const token = generateToken(user);

    const userData = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      address: user.address,
      district: user.district,
      province: user.province,
      postal_code: user.postal_code,
      created_at: user.created_at
    };

    console.log('✅ User logged in:', user.email);
    console.log('📦 User data sent:', userData);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: userData
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
      error: error.message 
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address, district, province, postal_code } = req.body;
    const userId = req.userId;

    console.log('📝 Updating profile for user:', userId);
    console.log('📦 Update data:', { name, phone, address, district, province, postal_code });

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, 
           phone = $2, 
           address = $3, 
           district = $4, 
           province = $5, 
           postal_code = $6,
           updated_at = NOW()
       WHERE user_id = $7
       RETURNING user_id, email, name, phone, role, address, district, province, postal_code, created_at`,
      [name, phone, address, district, province, postal_code, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบผู้ใช้' 
      });
    }

    const updatedUser = result.rows[0];

    console.log('✅ Profile updated:', updatedUser);

    res.json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      user: {
        user_id: updatedUser.user_id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        address: updatedUser.address,
        district: updatedUser.district,
        province: updatedUser.province,
        postal_code: updatedUser.postal_code,
        created_at: updatedUser.created_at
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล',
      error: error.message 
    });
  }
};

// Get Current User
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT user_id, email, name, phone, role, 
              address, district, province, postal_code, 
              created_at 
       FROM users 
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบผู้ใช้' 
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        district: user.district,
        province: user.province,
        postal_code: user.postal_code,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'ออกจากระบบสำเร็จ'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'ไม่มี token' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const newToken = jwt.sign(
      { 
        id: decoded.id || decoded.user_id,
        user_id: decoded.user_id || decoded.id, 
        email: decoded.email, 
        role: decoded.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('❌ Refresh token error:', error);
    res.status(401).json({ 
      success: false,
      message: 'Token ไม่ถูกต้อง',
      error: error.message 
    });
  }
};

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    let result = await pool.query(
      'SELECT user_id, email, name, phone, role, address, district, province, postal_code FROM users WHERE email = $1',
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (email, name, role, google_id, auth_provider, created_at) 
         VALUES ($1, $2, 'user', $3, 'google', NOW()) 
         RETURNING user_id, email, name, phone, role, address, district, province, postal_code`,
        [email, name, googleId]
      );
      user = result.rows[0];
      console.log('✅ New Google user created:', email);
    } else {
      user = result.rows[0];
      console.log('✅ Existing Google user logged in:', email);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบด้วย Google สำเร็จ',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        district: user.district,
        province: user.province,
        postal_code: user.postal_code
      }
    });
  } catch (error) {
    console.error('❌ Google login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
};

// Facebook Login
exports.facebookLogin = async (req, res) => {
  try {
    const { email, name, facebookId } = req.body;

    let result = await pool.query(
      'SELECT user_id, email, name, phone, role, address, district, province, postal_code FROM users WHERE email = $1',
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (email, name, role, facebook_id, auth_provider, created_at) 
         VALUES ($1, $2, 'user', $3, 'facebook', NOW()) 
         RETURNING user_id, email, name, phone, role, address, district, province, postal_code`,
        [email, name, facebookId]
      );
      user = result.rows[0];
      console.log('✅ New Facebook user created:', email);
    } else {
      user = result.rows[0];
      console.log('✅ Existing Facebook user logged in:', email);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบด้วย Facebook สำเร็จ',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        district: user.district,
        province: user.province,
        postal_code: user.postal_code
      }
    });
  } catch (error) {
    console.error('❌ Facebook login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
};

// Line Login
exports.lineLogin = async (req, res) => {
  try {
    const { email, name, lineId } = req.body;

    let result = await pool.query(
      'SELECT user_id, email, name, phone, role, address, district, province, postal_code FROM users WHERE email = $1',
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (email, name, role, line_id, auth_provider, created_at) 
         VALUES ($1, $2, 'user', $3, 'line', NOW()) 
         RETURNING user_id, email, name, phone, role, address, district, province, postal_code`,
        [email, name, lineId]
      );
      user = result.rows[0];
      console.log('✅ New LINE user created:', email);
    } else {
      user = result.rows[0];
      console.log('✅ Existing LINE user logged in:', email);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'เข้าสู่ระบบด้วย LINE สำเร็จ',
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        district: user.district,
        province: user.province,
        postal_code: user.postal_code
      }
    });
  } catch (error) {
    console.error('❌ LINE login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด',
      error: error.message 
    });
  }
};