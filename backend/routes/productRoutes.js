const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);      // ⭐ เพิ่ม
router.delete('/:id', authMiddleware, productController.deleteProduct);   // ⭐ เพิ่ม

module.exports = router;