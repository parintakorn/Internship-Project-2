const express    = require('express');
const router     = express.Router();
const adminAuth  = require('../middleware/adminAuth');
const ctrl       = require('../controllers/warehouseController');

// ── Stats ──────────────────────────────────────────────────────────────────────
router.get('/stats',                        adminAuth, ctrl.getStats);

// ── Reports ────────────────────────────────────────────────────────────────────
router.get('/report/monthly',               adminAuth, ctrl.getMonthlyReport);
router.get('/report/stock-by-category',     adminAuth, ctrl.getStockByCategory);
router.get('/report/daily',                 adminAuth, ctrl.getDailyReport);
router.get('/report/monthly-detail',        adminAuth, ctrl.getMonthlyDetailReport);
router.get('/report/yearly',                adminAuth, ctrl.getYearlyReport);

// ── Inventory ──────────────────────────────────────────────────────────────────
router.get   ('/inventory',                 adminAuth, ctrl.getInventory);
router.get   ('/inventory/:id',             adminAuth, ctrl.getInventoryById);
router.delete('/inventory/:id',             adminAuth, ctrl.deleteInventory);

// ── Withdrawals ────────────────────────────────────────────────────────────────
router.get   ('/withdrawals',               adminAuth, ctrl.getWithdrawals);
router.delete('/withdrawals/:id',           adminAuth, ctrl.deleteWithdrawal);   // ลบประวัติอย่างเดียว
router.delete('/withdrawal/:id/undo',       adminAuth, ctrl.undoWithdrawal);     // ลบ + คืน IN_STOCK
router.post  ('/withdraw',                  adminAuth, ctrl.withdraw);            // เบิกวัตถุดิบ

// ── Search + QR ───────────────────────────────────────────────────────────────
router.post  ('/search',                    adminAuth, ctrl.searchInventory);     // ค้นหาด้วย code
router.post  ('/generate-qr',              adminAuth, ctrl.generateQR);          // สร้าง QR + inventory

// ── Warehouse Products (ชนิดวัตถุดิบ) ─────────────────────────────────────────
router.get   ('/ingredients',              adminAuth, ctrl.getWarehouseProducts);
router.post  ('/ingredients',              adminAuth, ctrl.createWarehouseProduct);
router.delete('/ingredients/:id',          adminAuth, ctrl.deleteWarehouseProduct);

// ── Prefixes ───────────────────────────────────────────────────────────────────
router.get   ('/prefixes',                 adminAuth, ctrl.getPrefixes);
router.post  ('/prefixes',                 adminAuth, ctrl.createPrefix);
router.put   ('/prefixes/:id',             adminAuth, ctrl.updatePrefix);
router.delete('/prefixes/:id',             adminAuth, ctrl.deletePrefix);

module.exports = router;