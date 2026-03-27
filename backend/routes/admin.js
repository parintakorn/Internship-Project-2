const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');
const { uploadProducts, uploadBanners } = require('../middleware/upload');
const wc = require('../controllers/warehouseController');

// ════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES — ต้องอยู่ก่อน router.use(adminAuth) !!
// สแกน QR → เปิดหน้า PublicIngredient → ดึงข้อมูลที่ route นี้
// ════════════════════════════════════════════════════════════════════
router.get('/public/ingredient/:code', wc.getPublicIngredient);

// ════════════════════════════════════════════════════════════════════
// ADMIN AUTH — ทุก route ด้านล่างต้องผ่าน middleware นี้
// ════════════════════════════════════════════════════════════════════
router.use(adminAuth);

// ════════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════════
router.get('/dashboard/stats', adminController.getDashboardStats);

// ════════════════════════════════════════════════════════════════════
// MEMBERS
// ════════════════════════════════════════════════════════════════════
router.get ('/members',                      adminController.getMembers);
router.get ('/members/tier-stats',           adminController.getTierStats);
router.get ('/members/:userId/addresses',    adminController.getMemberAddresses);
router.get ('/members/:id',                  adminController.getMemberById);
router.put ('/members/:id',                  adminController.updateMember);
router.post('/members/:id/adjust-spending',  adminController.adjustSpending);
router.get ('/users/:userId',                adminController.getUserById);

// ════════════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════════════
router.get   ('/orders',            adminController.getOrders);
router.get   ('/orders/:id',        adminController.getOrderById);
router.put   ('/orders/:id/status', adminController.updateOrderStatus);
router.delete('/orders/:id',        adminController.deleteOrder);

// ════════════════════════════════════════════════════════════════════
// PRODUCTS
// ════════════════════════════════════════════════════════════════════
router.get   ('/products',     adminController.getProducts);
router.post  ('/products',     adminController.createProduct);
router.put   ('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// ════════════════════════════════════════════════════════════════════
// PROMOTIONS
// ════════════════════════════════════════════════════════════════════
router.get   ('/promotions',     adminController.getPromotions);
router.post  ('/promotions',     adminController.createPromotion);
router.put   ('/promotions/:id', adminController.updatePromotion);
router.delete('/promotions/:id', adminController.deletePromotion);

// ════════════════════════════════════════════════════════════════════
// BANNERS
// ════════════════════════════════════════════════════════════════════
router.get   ('/banners/admin/all',  adminController.getAllBannersAdmin);
router.post  ('/banners/admin',      uploadBanners.single('image'), adminController.createBanner);
router.put   ('/banners/admin/:id',  uploadBanners.single('image'), adminController.updateBanner);
router.delete('/banners/admin/:id',  adminController.deleteBanner);

// ════════════════════════════════════════════════════════════════════
// UPLOAD
// ════════════════════════════════════════════════════════════════════
router.post('/upload', uploadProducts.single('image'), adminController.uploadImage);

// ════════════════════════════════════════════════════════════════════
// TIERS
// ════════════════════════════════════════════════════════════════════
router.get('/tiers',     adminController.getTiers);
router.put('/tiers/:id', adminController.updateTier);

// ════════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════════
router.get('/reports/sales',        adminController.getSalesReport);
router.get('/reports/top-products', adminController.getTopProducts);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Stats & Reports
// ════════════════════════════════════════════════════════════════════
router.get('/warehouse/stats',                    wc.getStats);
router.get('/warehouse/report/monthly',           wc.getMonthlyReport);
router.get('/warehouse/report/stock-by-category', wc.getStockByCategory);
router.get('/warehouse/report/daily',             wc.getDailyReport);
router.get('/warehouse/report/monthly-detail',    wc.getMonthlyDetailReport);
router.get('/warehouse/report/yearly',            wc.getYearlyReport);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Inventory
// ════════════════════════════════════════════════════════════════════
router.get   ('/warehouse/inventory',     wc.getInventory);
router.get   ('/warehouse/inventory/:id', wc.getInventoryById);
router.delete('/warehouse/inventory/:id', wc.deleteInventory);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Withdrawals
// ════════════════════════════════════════════════════════════════════
router.get   ('/warehouse/withdrawals',         wc.getWithdrawals);
router.delete('/warehouse/withdrawals/:id',     wc.deleteWithdrawal);
router.delete('/warehouse/withdrawal/:id/undo', wc.undoWithdrawal);
router.post  ('/warehouse/withdraw',            wc.withdraw);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Search + QR
// ════════════════════════════════════════════════════════════════════
router.post('/warehouse/search',      wc.searchInventory);
router.post('/warehouse/generate-qr', wc.generateQR);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Ingredients (warehouse_products)
// ════════════════════════════════════════════════════════════════════
router.get   ('/warehouse/ingredients',     wc.getWarehouseProducts);
router.post  ('/warehouse/ingredients',     wc.createWarehouseProduct);
router.delete('/warehouse/ingredients/:id', wc.deleteWarehouseProduct);

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE — Prefixes
// ════════════════════════════════════════════════════════════════════
router.get   ('/warehouse/prefixes',     wc.getPrefixes);
router.post  ('/warehouse/prefixes',     wc.createPrefix);
router.put   ('/warehouse/prefixes/:id', wc.updatePrefix);
router.delete('/warehouse/prefixes/:id', wc.deletePrefix);

module.exports = router;
