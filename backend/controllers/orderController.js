const { pool } = require('../config/database');

// ✅ สร้าง Order ใหม่
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { 
      items, 
      total_price,
      shipping_address,
      customer_name,
      customer_phone,
      customer_email,
      email,
      payment_method = 'promptpay'
    } = req.body;

    const user_id = req.user.user_id;

    console.log('📥 Creating order with data:', {
      user_id,
      total_price,
      items_count: items?.length,
      customer_name,
      customer_phone,
      customer_email,
      payment_method,
      shipping_address
    });

    // ========== Validation ==========
    if (!items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'ไม่มีสินค้าในคำสั่งซื้อ' });
    }

    if (!customer_name || !customer_phone) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' });
    }

    if (!total_price || total_price <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'ยอดเงินไม่ถูกต้อง' });
    }

    // ========== Generate Order Number ==========
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const order_number = `ORD-${dateStr}-${randomNum}`;

    console.log('📝 Generated order_number:', order_number);

    // ✅ ดึงข้อมูล User (ถ้าไม่ส่ง email มา)
    let finalEmail = customer_email || email;
    if (!finalEmail) {
      const userResult = await client.query(
        'SELECT email FROM users WHERE user_id = $1',
        [user_id]
      );
      if (userResult.rows.length > 0) {
        finalEmail = userResult.rows[0].email;
      }
    }

    // ✅ จัดการ Shipping Address - เก็บเป็น JSON STRING ใน TEXT column
    let shippingAddressText;
    
    if (typeof shipping_address === 'string') {
      // ถ้าเป็น string ธรรมดา ให้ wrap เป็น JSON
      shippingAddressText = JSON.stringify({
        full_address: shipping_address,
        district: '',
        province: '',
        postal_code: '',
        full_name: customer_name,
        phone: customer_phone
      });
    } else if (typeof shipping_address === 'object' && shipping_address !== null) {
      // ถ้าเป็น object อยู่แล้ว ให้แปลงเป็น JSON string
      shippingAddressText = JSON.stringify({
        full_address: shipping_address.full_address || shipping_address.address || '',
        district: shipping_address.district || '',
        province: shipping_address.province || '',
        postal_code: shipping_address.postal_code || '',
        full_name: shipping_address.full_name || customer_name,
        phone: shipping_address.phone || customer_phone
      });
    } else {
      // ถ้าไม่มีข้อมูลเลย
      shippingAddressText = JSON.stringify({
        full_address: '',
        district: '',
        province: '',
        postal_code: '',
        full_name: customer_name,
        phone: customer_phone
      });
    }

    console.log('📍 Shipping Address (will save as TEXT):', shippingAddressText);

    // ========== Create Order with Customer Info ==========
    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id,
        order_number,
        total_price,
        status,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        payment_method,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING order_id, order_number, total_price, status, created_at
    `, [
      user_id, 
      order_number, 
      total_price, 
      'pending',
      customer_name,
      finalEmail,
      customer_phone,
      shippingAddressText, // ✅ เก็บเป็น JSON string ใน TEXT column
      payment_method
    ]);

    const order = orderResult.rows[0];
    const order_id = order.order_id;

    console.log('✅ Order created with ID:', order_id);

    // ========== Insert Order Items & Update Stock ==========
    for (const item of items) {
      const productCheck = await client.query(
        'SELECT product_id, stock, name FROM products WHERE product_id = $1',
        [item.product_id]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `สินค้า ID ${item.product_id} ไม่พบในระบบ` 
        });
      }

      const product = productCheck.rows[0];

      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `สินค้า "${product.name}" มีสต็อกเหลือเพียง ${product.stock} ชิ้น` 
        });
      }

      await client.query(`
        INSERT INTO order_items (order_id, product_id, price_at_time, quantity)
        VALUES ($1, $2, $3, $4)
      `, [order_id, item.product_id, item.price, item.quantity]);

      await client.query(`
        UPDATE products
        SET stock = stock - $1
        WHERE product_id = $2
      `, [item.quantity, item.product_id]);

      console.log(`✅ Added item: ${product.name} x${item.quantity}`);
    }

    console.log('✅ Order items inserted, stock updated');

    // ========== Update User's Total Spending ==========
    await client.query(`
      UPDATE users
      SET total_spending = total_spending + $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [total_price, user_id]);

    console.log('✅ User spending updated (+฿' + total_price + ')');

    // ========== Create Payment Record ==========
    await client.query(`
      INSERT INTO payments (
        order_id,
        user_id,
        payment_method,
        amount,
        status
      )
      VALUES ($1, $2, $3, $4, $5)
    `, [order_id, user_id, payment_method, total_price, 'pending']);

    console.log('✅ Payment record created');

    await client.query('COMMIT');

    console.log('✅✅✅ Order creation SUCCESS! ✅✅✅');

    res.status(201).json({
      message: 'สร้างคำสั่งซื้อสำเร็จ',
      order_id: order_id,
      order_number: order.order_number,
      total_price: order.total_price,
      status: order.status,
      created_at: order.created_at
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Create order error:', error.message);
    console.error('Full error:', error);
    
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ', 
      error: error.message 
    });
  } finally {
    client.release();
  }
};

// ✅ ดึงรายการ Orders
exports.getOrders = async (req, res) => {
  try {
    const user_id = req.user.user_id;

    console.log(`[getOrders] Fetching for user_id: ${user_id}`);

    const result = await pool.query(`
      SELECT 
        o.order_id,
        o.order_number,
        o.total_price,
        o.status,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.shipping_address,
        o.payment_method,
        o.created_at,
        COALESCE(COUNT(oi.id), 0) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
    `, [user_id]);

    console.log(`[getOrders] Found ${result.rows.length} orders`);

    // ✅ Parse shipping_address (รองรับทั้ง JSON string และ plain text)
    const ordersWithParsedAddress = result.rows.map(order => {
      let parsedAddress = null;
      
      if (order.shipping_address) {
        try {
          // ลอง parse เป็น JSON
          parsedAddress = JSON.parse(order.shipping_address);
        } catch (e) {
          // ถ้า parse ไม่ได้ แสดงว่าเป็น plain text (ข้อมูลเก่า)
          parsedAddress = {
            full_address: order.shipping_address,
            district: '',
            province: '',
            postal_code: '',
            full_name: order.customer_name,
            phone: order.customer_phone
          };
        }
      }

      return {
        ...order,
        shipping_address: parsedAddress
      };
    });

    res.json(ordersWithParsedAddress);
  } catch (error) {
    console.error('❌ [getOrders] Error:', error.message);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงคำสั่งซื้อ',
      error: error.message 
    });
  }
};

// ✅ ดึงข้อมูล Order เดียวพร้อมรายละเอียดสินค้า
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    const orderResult = await pool.query(`
      SELECT 
        order_id,
        order_number,
        user_id,
        total_price,
        status,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        payment_method,
        created_at
      FROM orders 
      WHERE order_id = $1 AND user_id = $2
    `, [id, user_id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });
    }

    const order = orderResult.rows[0];

    // ✅ Parse shipping_address (รองรับทั้ง JSON string และ plain text)
    let parsedAddress = null;
    if (order.shipping_address) {
      try {
        // ลอง parse เป็น JSON
        parsedAddress = JSON.parse(order.shipping_address);
      } catch (e) {
        // ถ้า parse ไม่ได้ แสดงว่าเป็น plain text (ข้อมูลเก่า)
        parsedAddress = {
          full_address: order.shipping_address,
          district: '',
          province: '',
          postal_code: '',
          full_name: order.customer_name,
          phone: order.customer_phone
        };
      }
    }

    const itemsResult = await pool.query(`
      SELECT 
        oi.*,
        p.name as product_name,
        p.image_url
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
    `, [id]);

    console.log(`📦 Retrieved order #${id} with ${itemsResult.rows.length} items`);

    res.json({
      order: {
        ...order,
        shipping_address: parsedAddress
      },
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('❌ Get order error:', error.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ✅ ยกเลิก Order
exports.cancelOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const user_id = req.user.user_id;

    console.log(`🔄 Attempting to cancel order #${id} for user_id: ${user_id}`);

    const orderResult = await client.query(`
      SELECT * FROM orders WHERE order_id = $1 AND user_id = $2
    `, [id, user_id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: `ไม่สามารถยกเลิกคำสั่งซื้อนี้ได้ เนื่องจากอยู่ในสถานะ: ${order.status}` 
      });
    }

    const itemsResult = await client.query(`
      SELECT oi.product_id, oi.quantity, p.name, p.stock
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id = $1
    `, [id]);

    console.log(`📦 Restoring stock for ${itemsResult.rows.length} items...`);

    for (const item of itemsResult.rows) {
      await client.query(`
        UPDATE products 
        SET stock = stock + $1 
        WHERE product_id = $2
      `, [item.quantity, item.product_id]);

      console.log(`✅ Restored: ${item.name} x${item.quantity}`);
    }

    await client.query(`
      UPDATE users
      SET total_spending = GREATEST(total_spending - $1, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [order.total_price, user_id]);

    console.log(`💰 Reversed spending: -฿${order.total_price}`);

    await client.query(`
      UPDATE orders 
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1
    `, [id]);

    await client.query(`
      UPDATE payments 
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1
    `, [id]);

    await client.query('COMMIT');

    console.log(`✅✅✅ Order #${id} cancelled successfully! ✅✅✅`);

    res.json({ 
      message: 'ยกเลิกคำสั่งซื้อสำเร็จ',
      order_number: order.order_number,
      restored_items: itemsResult.rows.length,
      refunded_amount: order.total_price
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Cancel order error:', error.message);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งซื้อ', 
      error: error.message 
    });
  } finally {
    client.release();
  }
};

module.exports = exports;