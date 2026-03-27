// controllers/adminOrderController.js
const { pool } = require('../config/database');

// ดึงรายการคำสั่งซื้อทั้งหมด (สำหรับ Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, status = '', search = '' } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    // สร้าง query
    let query = 'SELECT * FROM orders WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    let params = [];
    let countParams = [];
    let paramIndex = 1;

    // Filter by status
    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      countParams.push(status);
      paramIndex++;
    }

    // Search by order_id or customer_name
    if (search) {
      query += ` AND (CAST(order_id AS TEXT) ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`;
      countQuery += ` AND (CAST(order_id AS TEXT) ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
      paramIndex++;
    }

    // Order by newest first
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    console.log('📊 Fetching orders with params:', { page, status, search, limit, offset });

    // Execute queries
    const [ordersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    console.log(`✅ Found ${ordersResult.rows.length} orders (total: ${total})`);

    res.json({
      success: true,
      orders: ordersResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        limit: limit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด', 
      error: error.message 
    });
  }
};

// ดึงรายละเอียดคำสั่งซื้อ (สำหรับ Admin) - ⬅️ API สำคัญ!
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('📦 Fetching order details for:', orderId);

    // 1. ดึงข้อมูล order
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

    // 2. ดึงข้อมูล items
    const itemsResult = await pool.query(
      `SELECT oi.*, p.name as product_name, p.image_url 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.product_id 
       WHERE oi.order_id = $1`,
      [orderId]
    );

    // 3. ⬅️ สำคัญ: ดึงข้อมูล payment
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE order_id = $1',
      [orderId]
    );

    const payment = paymentResult.rows.length > 0 ? paymentResult.rows[0] : null;

    console.log('✅ Order fetched:', orderId);
    console.log('💳 Payment data:', payment);
    console.log('📦 Items count:', itemsResult.rows.length);

    // 4. Return ข้อมูลครบถ้วน
    res.json({
      success: true,
      order: order,
      items: itemsResult.rows,
      payment: payment  // ⬅️ ต้องมีส่วนนี้!
    });

  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด', 
      error: error.message 
    });
  }
};

// อัพเดทสถานะคำสั่งซื้อ
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'กรุณาระบุสถานะ' 
      });
    }

    const allowedStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        message: 'สถานะไม่ถูกต้อง' 
      });
    }

    await pool.query(
      `UPDATE orders 
       SET status = $1, 
           updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2`,
      [status, orderId]
    );

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      message: 'อัพเดทสถานะสำเร็จ',
      status: status
    });

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด', 
      error: error.message 
    });
  }
};

// ลบคำสั่งซื้อ
exports.deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // ลบใน order กับข้อมูลที่เกี่ยวข้องจะถูกลบอัตโนมัติด้วย CASCADE
    const result = await pool.query(
      'DELETE FROM orders WHERE order_id = $1 RETURNING *',
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'ไม่พบคำสั่งซื้อ' 
      });
    }

    console.log(`✅ Order ${orderId} deleted`);

    res.json({
      success: true,
      message: 'ลบคำสั่งซื้อสำเร็จ'
    });

  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({ 
      success: false,
      message: 'เกิดข้อผิดพลาด', 
      error: error.message 
    });
  }
};

module.exports = exports;