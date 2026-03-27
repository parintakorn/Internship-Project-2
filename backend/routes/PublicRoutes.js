// routes/publicRoutes.js
const express = require('express');
const router = express.Router();

/**
 * GET /api/public/invoice/:orderId
 * ดึงข้อมูลใบกำกับภาษีแบบ Public (ไม่ต้อง Login)
 */
router.get('/public/invoice/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = req.app.locals.db; // ใช้ pool จาก app.locals
    
    console.log('Fetching public invoice for order:', orderId);
    
    // ดึงข้อมูล Order
    const [orders] = await db.query(
      `SELECT 
        order_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        payment_method,
        total_price,
        status,
        created_at,
        updated_at
      FROM orders 
      WHERE order_id = ?`,
      [orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    // ดึงรายการสินค้าในออเดอร์
    const [items] = await db.query(
      `SELECT 
        item_id,
        order_id,
        product_id,
        product_name,
        quantity,
        price_at_time,
        unit,
        weight_unit
      FROM order_items 
      WHERE order_id = ?
      ORDER BY item_id ASC`,
      [orderId]
    );
    
    // ดึงข้อมูลการชำระเงิน (ถ้ามี)
    const [payment] = await db.query(
      `SELECT 
        payment_id,
        order_id,
        payment_method,
        amount,
        slip_url,
        payment_status,
        created_at
      FROM payments 
      WHERE order_id = ?
      LIMIT 1`,
      [orderId]
    );
    
    res.json({
      success: true,
      order: orders[0],
      items: items,
      payment: payment[0] || null
    });
    
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error while fetching invoice' 
    });
  }
});

/**
 * GET /api/public/customer/:userId
 * ดึงข้อมูลลูกค้าแบบ Public (เฉพาะข้อมูลที่จำเป็น)
 */
router.get('/public/customer/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = req.app.locals.db; // ใช้ pool จาก app.locals
    
    console.log('Fetching public customer data for user:', userId);
    
    const [users] = await db.query(
      `SELECT 
        user_id,
        name,
        email,
        phone,
        address,
        district,
        province,
        postal_code
      FROM users 
      WHERE user_id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Customer not found' 
      });
    }
    
    res.json({
      success: true,
      ...users[0]
    });
    
  } catch (error) {
    console.error('Error fetching public customer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error while fetching customer data' 
    });
  }
});

module.exports = router;