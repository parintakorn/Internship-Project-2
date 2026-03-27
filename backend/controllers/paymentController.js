const { pool } = require('../config/database');
const QRCode = require('qrcode');

// สร้าง QR Code พร้อมเพย์
exports.generateQRCode = async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE order_id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบคำสั่งซื้อ' 
      });
    }

    const order = orderResult.rows[0];

    const promptPayNumber = process.env.PROMPTPAY_NUMBER || '0812345678';
    const amount = Math.floor(order.total_price);

    const promptPayData = `00020101021229370016A000000677010111${promptPayNumber.padStart(13, '0')}5303764540${amount}5802TH63040000`;

    const qrCodeDataURL = await QRCode.toDataURL(promptPayData, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    res.json({
      success: true,
      qrCodeUrl: qrCodeDataURL,
      amount: amount,
      orderId: orderId
    });

  } catch (error) {
    console.error('❌ Error generating QR code:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้าง QR Code', 
      error: error.message 
    });
  }
};

// อัพโหลดสลิปโอนเงิน (เวอร์ชันปรับปรุง)
exports.uploadSlip = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'กรุณาอัพโหลดไฟล์สลิป' 
      });
    }

    console.log('📸 Uploading slip for order:', orderId);
    console.log('📁 File:', req.file.filename);
    console.log('📁 Original name:', req.file.originalname);
    console.log('📁 MIME type:', req.file.mimetype);

    // ดึง BASE_URL จาก env + ตรวจสอบว่ามีหรือไม่
    let baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
      console.error('⚠️ BASE_URL ไม่ได้กำหนดใน .env! ใช้ fallback ชั่วคราว');
      baseUrl = 'http://192.168.1.113:3000';
    }

    // ทำให้แน่ใจว่ามี / ท้าย
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    // ใช้ encodeURIComponent เพื่อความปลอดภัย (ป้องกันชื่อไฟล์มีอักขระพิเศษ)
    const safeFilename = encodeURIComponent(req.file.filename);
    const slipUrl = `${normalizedBaseUrl}images/slips/${safeFilename}`;

    console.log('Generated full slip URL:', slipUrl);

    // ตรวจสอบว่ามี payment record หรือยัง
    const checkPayment = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1',
      [orderId]
    );

    let paymentId;

    if (checkPayment.rows.length > 0) {
      await pool.query(
        `UPDATE payments 
         SET slip_url = $1, 
             uploaded_at = CURRENT_TIMESTAMP,
             status = 'pending_verification'
         WHERE order_id = $2
         RETURNING id`,
        [slipUrl, orderId]
      );
      console.log('✅ Updated existing payment with full URL:', slipUrl);
      paymentId = checkPayment.rows[0].id;
    } else {
      const insertResult = await pool.query(
        `INSERT INTO payments (order_id, slip_url, uploaded_at, status, amount, method, paid_at)
         SELECT $1, $2, CURRENT_TIMESTAMP, 'pending_verification', total_price, payment_method, CURRENT_TIMESTAMP
         FROM orders WHERE order_id = $1
         RETURNING id`,
        [orderId, slipUrl]
      );
      console.log('✅ Created new payment with full URL:', slipUrl);
      paymentId = insertResult.rows[0].id;
    }

    // อัพเดทสถานะ order (ถ้าต้องการให้ admin ตรวจสอบก่อน สามารถ comment ออกได้)
    await pool.query(
      `UPDATE orders 
       SET status = 'paid',
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $1`,
      [orderId]
    );

    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    console.log('✅ Slip uploaded successfully:', slipUrl);

    res.json({
      success: true,
      message: 'อัพโหลดสลิปสำเร็จ กำลังรอการตรวจสอบ',
      payment: paymentResult.rows[0]  // ส่ง full URL กลับไป frontend
    });

  } catch (error) {
    console.error('❌ Error uploading slip:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพโหลดสลิป', 
      error: error.message 
    });
  }
};

module.exports = exports;