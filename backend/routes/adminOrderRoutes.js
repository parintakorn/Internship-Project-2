const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const adminAuth = require('../middleware/adminAuth');

router.get('/:orderId', adminAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [order] = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    const items = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    const payment = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    
    res.json({
      order: order.rows[0],
      items: items.rows,
      payment: payment.rows[0] || null  // ⬅️ สำคัญ!
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;