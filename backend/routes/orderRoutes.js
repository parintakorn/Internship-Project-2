const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ สร้าง Order ใหม่ (ต้อง login)
router.post('/', authMiddleware, orderController.createOrder);

// ✅ ดึงรายการ Orders ทั้งหมดของผู้ใช้
router.get('/', authMiddleware, orderController.getOrders);

// ✅ ดึงข้อมูล Order เดียว (ตาม ID)
router.get('/:id', authMiddleware, orderController.getOrderById);

// ✅ ยกเลิก Order (ผู้ใช้เท่านั้น)
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

// ✅ อัพเดทสถานะ Order (Admin เท่านั้น - ใช้ใน admin routes)
// router.put('/:id/status', authMiddleware, adminAuth, orderController.updateOrderStatus);

module.exports = router;