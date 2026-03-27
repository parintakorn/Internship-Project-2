const { pool } = require('../config/database');

// ============================================
// DASHBOARD
// ============================================

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {
      todaySales: 0, monthSales: 0, yearSales: 0,
      pendingOrders: 0, membersByTier: [], recentOrders: [], salesLast7Days: []
    };

    const safeQuery = async (q, params = [], name) => {
      try {
        const r = await pool.query(q, params);
        return r;
      } catch (err) {
        console.error(`[DASHBOARD] ${name} FAILED:`, err.message);
        return null;
      }
    };

    const todayRes = await safeQuery(`SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE DATE(created_at)=CURRENT_DATE AND status IN ('paid','shipped','completed')`, [], 'todaySales');
    if (todayRes) stats.todaySales = parseFloat(todayRes.rows[0]?.total || 0);

    const monthRes = await safeQuery(`SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',CURRENT_DATE) AND status IN ('paid','shipped','completed')`, [], 'monthSales');
    if (monthRes) stats.monthSales = parseFloat(monthRes.rows[0]?.total || 0);

    const yearRes = await safeQuery(`SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE DATE_TRUNC('year',created_at)=DATE_TRUNC('year',CURRENT_DATE) AND status IN ('paid','shipped','completed')`, [], 'yearSales');
    if (yearRes) stats.yearSales = parseFloat(yearRes.rows[0]?.total || 0);

    const pendingRes = await safeQuery(`SELECT COUNT(*) as count FROM orders WHERE status='pending'`, [], 'pendingOrders');
    if (pendingRes) stats.pendingOrders = parseInt(pendingRes.rows[0]?.count || 0);

    const tierRes = await safeQuery(`
      SELECT t.tier_name, t.tier_id, COALESCE(COUNT(u.user_id),0) as count
      FROM member_tiers t
      LEFT JOIN users u ON t.tier_id=u.tier_id AND u.role='user'
      GROUP BY t.tier_id, t.tier_name
      ORDER BY t.min_spending NULLS LAST
    `, [], 'membersByTier');
    if (tierRes) stats.membersByTier = tierRes.rows || [];

    const recentRes = await safeQuery(`
      SELECT o.order_id, o.total_price, o.status, o.created_at,
        COALESCE(u.name,'Guest') as customer_name, COALESCE(u.email,'ไม่ระบุ') as customer_email
      FROM orders o LEFT JOIN users u ON o.user_id=u.user_id
      ORDER BY o.created_at DESC LIMIT 5
    `, [], 'recentOrders');
    if (recentRes) stats.recentOrders = recentRes.rows || [];

    const last7Res = await safeQuery(`
      SELECT DATE(created_at) as date, COALESCE(SUM(total_price),0) as total
      FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND status IN ('paid','shipped','completed')
      GROUP BY DATE(created_at) ORDER BY date
    `, [], 'salesLast7Days');
    if (last7Res) stats.salesLast7Days = last7Res.rows || [];

    res.json({ success: true, message: 'ดึงข้อมูลแดชบอร์ดสำเร็จ', stats });
  } catch (error) {
    console.error('[DASHBOARD CRITICAL]', error.stack);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดร้ายแรงในแดชบอร์ด' });
  }
};

// ============================================
// MEMBERS MANAGEMENT
// ============================================

exports.getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', tier = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT u.user_id, u.email, u.name, u.phone, u.total_spending, u.created_at, u.last_login, t.tier_name, t.discount_percent
      FROM users u JOIN member_tiers t ON u.tier_id=t.tier_id WHERE u.role='user'
    `;
    const params = [];
    let i = 1;
    if (search) { query += ` AND (u.email ILIKE $${i} OR u.name ILIKE $${i})`; params.push(`%${search}%`); i++; }
    if (tier)   { query += ` AND u.tier_id=$${i}`; params.push(tier); i++; }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) as f`, params);
    const totalMembers = parseInt(countResult.rows[0].count);

    query += ` ORDER BY u.created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);

    res.json({ message: 'ดึงข้อมูลสมาชิกสำเร็จ', members: result.rows, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalMembers/limit), totalMembers, limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.getMemberById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.*, t.tier_name, t.discount_percent, t.min_spending
      FROM users u JOIN member_tiers t ON u.tier_id=t.tier_id
      WHERE u.user_id=$1 AND u.role='user'
    `, [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบสมาชิก' });

    const orders = await pool.query(`SELECT order_id, order_number, total_price, status, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [id]);
    const tierHistory = await pool.query(`SELECT * FROM tier_upgrade_history WHERE user_id=$1 ORDER BY upgraded_at DESC`, [id]);

    res.json({ message: 'ดึงข้อมูลสมาชิกสำเร็จ', member: result.rows[0], orders: orders.rows, tierHistory: tierHistory.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, district, province, postal_code } = req.body;
    const result = await pool.query(`
      UPDATE users SET name=$1, phone=$2, address=$3, district=$4, province=$5, postal_code=$6, updated_at=CURRENT_TIMESTAMP
      WHERE user_id=$7 AND role='user' RETURNING *
    `, [name, phone, address, district, province, postal_code, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    res.json({ message: 'อัปเดตข้อมูลสมาชิกสำเร็จ', member: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.adjustSpending = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ message: 'ยอดเงินไม่ถูกต้อง' });
    const result = await pool.query(`
      UPDATE users SET total_spending=GREATEST(total_spending+$1,0), updated_at=CURRENT_TIMESTAMP
      WHERE user_id=$2 AND role='user' RETURNING *
    `, [amount, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบสมาชิก' });
    await pool.query('SELECT update_user_tier($1)', [id]);
    res.json({ message: 'ปรับยอดซื้อสำเร็จ', member: result.rows[0], adjustment: { amount: parseFloat(amount), reason: reason || 'ปรับโดย Admin' } });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.getTierStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT t.tier_name, t.tier_id, t.min_spending, t.discount_percent,
        COUNT(u.user_id) as member_count,
        COALESCE(AVG(u.total_spending),0)::DECIMAL(10,2) as avg_spending,
        COALESCE(SUM(u.total_spending),0)::DECIMAL(10,2) as total_spending
      FROM member_tiers t LEFT JOIN users u ON t.tier_id=u.tier_id AND u.role='user'
      GROUP BY t.tier_id, t.tier_name, t.min_spending, t.discount_percent ORDER BY t.min_spending
    `);
    res.json({ message: 'ดึงสถิติ Tier สำเร็จ', stats: stats.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.getMemberAddresses = async (req, res) => {
  try {
    const { userId } = req.params;
    const userResult = await pool.query('SELECT user_id, email, name FROM users WHERE user_id=$1', [userId]);
    if (!userResult.rows.length) return res.status(404).json({ success: false, message: 'ไม่พบสมาชิกนี้' });

    const addressResult = await pool.query(`
      SELECT id, user_id, label, name, phone, address, amphoe, province, postal_code, is_default, created_at, updated_at
      FROM addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC
    `, [userId]);

    const formattedAddresses = addressResult.rows.map(addr => ({
      address_id: addr.id, recipient_name: addr.name, phone: addr.phone,
      address: addr.address, district: addr.amphoe || '', province: addr.province || '',
      postal_code: addr.postal_code || '', is_default: addr.is_default ? 1 : 0,
      created_at: addr.created_at, updated_at: addr.updated_at
    }));

    res.json({ success: true, user: userResult.rows[0], addresses: formattedAddresses, total: formattedAddresses.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลที่อยู่', error: error.message });
  }
};

// ============================================
// ORDERS MANAGEMENT
// ============================================

exports.getOrders = async (req, res) => {
  try {
    const { page = 1, status = '', search = '' } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;
    let query = `
      SELECT o.order_id, o.order_number, o.total_price, o.status, o.customer_name, o.customer_phone, o.created_at,
        COALESCE(COUNT(oi.id),0) as item_count
      FROM orders o LEFT JOIN order_items oi ON o.order_id=oi.order_id WHERE 1=1
    `;
    const params = [];
    if (status) { query += ` AND o.status=$${params.length+1}`; params.push(status); }
    if (search) { query += ` AND (o.order_number ILIKE $${params.length+1} OR o.customer_name ILIKE $${params.length+1})`; params.push(`%${search}%`); }
    query += ` GROUP BY o.order_id ORDER BY o.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    let countQuery = `SELECT COUNT(*) as total FROM orders o WHERE 1=1`;
    const countParams = [];
    if (status) { countQuery += ` AND o.status=$${countParams.length+1}`; countParams.push(status); }
    if (search) { countQuery += ` AND (o.order_number ILIKE $${countParams.length+1} OR o.customer_name ILIKE $${countParams.length+1})`; countParams.push(`%${search}%`); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({ orders: result.rows, pagination: { total, page: parseInt(page), pages: Math.ceil(total/limit), limit } });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงคำสั่งซื้อ', error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const orderResult = await pool.query(`
      SELECT o.order_id, o.order_number, o.user_id, o.total_price, o.status, o.shipping_address, o.created_at, o.updated_at,
        COALESCE(u.name,'Guest') as customer_name, COALESCE(u.email,'ไม่ระบุ') as customer_email, COALESCE(u.phone,'ไม่ระบุ') as customer_phone
      FROM orders o LEFT JOIN users u ON o.user_id=u.user_id WHERE o.order_id=$1
    `, [id]);
    if (!orderResult.rows.length) return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });

    const itemsResult = await pool.query(`
      SELECT oi.id, oi.product_id, oi.price_at_time as price, oi.quantity, p.name as product_name, p.image_url
      FROM order_items oi LEFT JOIN products p ON oi.product_id=p.product_id WHERE oi.order_id=$1
    `, [id]);

    const paymentResult = await pool.query(`SELECT * FROM payments WHERE order_id=$1`, [id]);
    res.json({ order: orderResult.rows[0], items: itemsResult.rows, payment: paymentResult.rows[0] || null });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    const result = await pool.query(`UPDATE orders SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE order_id=$2 RETURNING *`, [status, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });
    res.json({ message: 'อัปเดตสถานะสำเร็จ', order: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM order_items WHERE order_id=$1', [id]);
    await pool.query('DELETE FROM payments WHERE order_id=$1', [id]);
    const result = await pool.query('DELETE FROM orders WHERE order_id=$1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });
    res.json({ message: 'ลบคำสั่งซื้อสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', category = '' } = req.query;
    const offset = (page - 1) * limit;
    let query = `SELECT p.*, COALESCE(c.name,'ไม่มีหมวดหมู่') as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.category_id WHERE 1=1`;
    const params = [];
    let i = 1;
    if (search)   { query += ` AND p.name ILIKE $${i}`; params.push(`%${search}%`); i++; }
    if (category) { query += ` AND p.category_id=$${i}`; params.push(category); i++; }

    const countResult = await pool.query(`SELECT COUNT(*) as count FROM (${query}) as f`, params);
    const totalProducts = parseInt(countResult.rows[0].count);

    query += ` ORDER BY p.created_at DESC LIMIT $${i} OFFSET $${i+1}`;
    params.push(parseInt(limit), offset);
    const result = await pool.query(query, params);

    res.json({ message: 'ดึงข้อมูลสินค้าสำเร็จ', products: result.rows, pagination: { currentPage: parseInt(page), totalPages: Math.ceil(totalProducts/parseInt(limit)), totalProducts, limit: parseInt(limit) } });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, description, category_id, image_url } = req.body;
    const result = await pool.query(`INSERT INTO products (name,price,stock,description,category_id,image_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [name, price, stock, description, category_id, image_url]);
    res.status(201).json({ message: 'เพิ่มสินค้าสำเร็จ', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock, description, category_id, image_url } = req.body;
    const result = await pool.query(`UPDATE products SET name=$1,price=$2,stock=$3,description=$4,category_id=$5,image_url=$6 WHERE product_id=$7 RETURNING *`, [name, price, stock, description, category_id, image_url, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบสินค้า' });
    res.json({ message: 'อัปเดตสินค้าสำเร็จ', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM products WHERE product_id=$1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบสินค้า' });
    res.json({ message: 'ลบสินค้าสำเร็จ', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// PROMOTIONS MANAGEMENT
// ============================================

exports.getPromotions = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM promotions ORDER BY created_at DESC`);
    res.json({ message: 'ดึงข้อมูลโปรโมชั่นสำเร็จ', promotions: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const { name, discount_type, discount_value, start_date, end_date, description, product_id, image_url } = req.body;
    const result = await pool.query(`INSERT INTO promotions (name,discount_type,discount_value,start_date,end_date,description,product_id,image_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [name, discount_type, discount_value, start_date, end_date, description, product_id, image_url]);
    res.status(201).json({ message: 'เพิ่มโปรโมชั่นสำเร็จ', promotion: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, discount_type, discount_value, start_date, end_date, description, product_id, image_url } = req.body;
    const result = await pool.query(`UPDATE promotions SET name=$1,discount_type=$2,discount_value=$3,start_date=$4,end_date=$5,description=$6,product_id=$7,image_url=$8 WHERE promotion_id=$9 RETURNING *`, [name, discount_type, discount_value, start_date, end_date, description, product_id, image_url, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบโปรโมชั่น' });
    res.json({ message: 'อัปเดตโปรโมชั่นสำเร็จ', promotion: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM promotions WHERE promotion_id=$1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบโปรโมชั่น' });
    res.json({ message: 'ลบโปรโมชั่นสำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// BANNERS
// ============================================

exports.getAllBannersAdmin = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM promotion_banners ORDER BY display_order ASC`);
    res.json({ banners: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.createBanner = async (req, res) => {
  try {
    const { title, link_url, display_order, is_active } = req.body;
    const image_url = req.file ? `/images/banners/${req.file.filename}` : req.body.image_url;
    const result = await pool.query(`INSERT INTO promotion_banners (title,image_url,link_url,display_order,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [title, image_url, link_url, display_order || 0, is_active !== false]);
    res.status(201).json({ message: 'เพิ่ม Banner สำเร็จ', banner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link_url, display_order, is_active } = req.body;
    const image_url = req.file ? `/images/banners/${req.file.filename}` : req.body.image_url;
    const result = await pool.query(`UPDATE promotion_banners SET title=$1,image_url=$2,link_url=$3,display_order=$4,is_active=$5,updated_at=NOW() WHERE banner_id=$6 RETURNING *`, [title, image_url, link_url, display_order, is_active, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบ Banner' });
    res.json({ message: 'อัปเดต Banner สำเร็จ', banner: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM promotion_banners WHERE banner_id=$1 RETURNING *', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบ Banner' });
    res.json({ message: 'ลบ Banner สำเร็จ' });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// UPLOAD IMAGE
// ============================================

exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
    const imageUrl = `/images/products/${req.file.filename}`; // ✅ ตรงกับ uploadProducts middleware
    res.json({ message: 'อัปโหลดสำเร็จ', url: imageUrl, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// TIERS
// ============================================

exports.getTiers = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM member_tiers ORDER BY min_spending`);
    res.json({ message: 'ดึงข้อมูล Tiers สำเร็จ', tiers: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.updateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { tier_name, min_spending, discount_percent } = req.body;
    const result = await pool.query(`UPDATE member_tiers SET tier_name=$1,min_spending=$2,discount_percent=$3 WHERE tier_id=$4 RETURNING *`, [tier_name, min_spending, discount_percent, id]);
    if (!result.rows.length) return res.status(404).json({ message: 'ไม่พบ Tier' });
    await pool.query('SELECT recalculate_all_tiers()');
    res.json({ message: 'อัปเดต Tier สำเร็จ', tier: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// REPORTS
// ============================================

exports.getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;
    let dateFormat = group_by === 'month' ? 'YYYY-MM' : group_by === 'year' ? 'YYYY' : 'YYYY-MM-DD';
    let query = `SELECT TO_CHAR(created_at,$1) as period, COUNT(*) as order_count, COALESCE(SUM(total_price),0) as total_sales FROM orders WHERE status IN ('paid','shipped','completed')`;
    const params = [dateFormat];
    let i = 2;
    if (start_date) { query += ` AND created_at>=$${i}`; params.push(start_date); i++; }
    if (end_date)   { query += ` AND created_at<=$${i}`; params.push(end_date); i++; }
    query += ` GROUP BY period ORDER BY period`;
    const result = await pool.query(query, params);
    res.json({ message: 'ดึงรายงานยอดขายสำเร็จ', report: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await pool.query(`
      SELECT p.product_id, p.name, p.price, p.image_url,
        COUNT(oi.id) as order_count, SUM(oi.quantity) as total_quantity,
        SUM(oi.price_at_time * oi.quantity) as total_revenue
      FROM order_items oi JOIN products p ON oi.product_id=p.product_id JOIN orders o ON oi.order_id=o.order_id
      WHERE o.status IN ('paid','shipped','completed')
      GROUP BY p.product_id, p.name, p.price, p.image_url ORDER BY total_revenue DESC LIMIT $1
    `, [limit]);
    res.json({ message: 'ดึงสินค้าขายดีสำเร็จ', products: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: error.message });
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`SELECT user_id,name,email,phone,address,district,province,postal_code,role,created_at FROM users WHERE user_id=$1`, [userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'ไม่พบข้อมูลลูกค้า' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
};

// ============================================
// WAREHOUSE MANAGEMENT (ใช้ warehouse_* tables)
// ============================================

exports.getIngredients = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, category, created_at FROM warehouse_products ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createIngredient = async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อและหมวดหมู่' });
  try {
    const { rows } = await pool.query('INSERT INTO warehouse_products (name,category) VALUES ($1,$2) RETURNING *', [name, category]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    await pool.query('DELETE FROM warehouse_products WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPrefixes = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, prefix_code AS code, description, created_at FROM warehouse_prefixes ORDER BY prefix_code ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createPrefix = async (req, res) => {
  const { code, description } = req.body;
  if (!code || !description) return res.status(400).json({ success: false, error: 'กรุณากรอกรหัสและคำอธิบาย' });
  try {
    const { rows } = await pool.query('INSERT INTO warehouse_prefixes (prefix_code,description) VALUES ($1,$2) RETURNING *', [code.toUpperCase(), description]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, error: `Prefix "${code}" มีอยู่แล้ว` });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deletePrefix = async (req, res) => {
  try {
    await pool.query('DELETE FROM warehouse_prefixes WHERE prefix_code=$1', [req.params.code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.generateQR = async (req, res) => {
  const { prefixCode, productId, weight, receiveDate } = req.body;
  if (!prefixCode || !productId || !weight || !receiveDate) return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบถ้วน' });
  try {
    const { rows: prodRows } = await pool.query('SELECT name FROM warehouse_products WHERE id=$1', [productId]);
    if (!prodRows.length) return res.status(404).json({ success: false, error: 'ไม่พบวัตถุดิบ' });

    const { rows: prefixRows } = await pool.query('SELECT id FROM warehouse_prefixes WHERE prefix_code=$1', [prefixCode]);
    if (!prefixRows.length) return res.status(404).json({ success: false, error: 'ไม่พบ Prefix' });

    const { rows: invRows } = await pool.query(
      `INSERT INTO warehouse_inventory (product_id,prefix_id,weight,receive_date,status) VALUES ($1,$2,$3,$4,'IN_STOCK') RETURNING id`,
      [productId, prefixRows[0].id, weight, receiveDate]
    );

    const inventoryCode = `${prefixCode}-${String(invRows[0].id).padStart(6, '0')}`;
    res.json({
      success: true,
      inventoryId: inventoryCode,
      dbId: invRows[0].id,
      productName: prodRows[0].name,
      weight,
      receiveDate,
      qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inventoryCode)}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.searchInventory = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'กรุณากรอกรหัส' });
  try {
    const parts = code.split('-');
    const numericId = parseInt(parts[parts.length - 1]);
    const { rows } = await pool.query(`
      SELECT wi.id AS "INVENTORY_ID",
        CONCAT(wp2.prefix_code,'-',LPAD(wi.id::TEXT,6,'0')) AS "INVENTORY_CODE",
        wp.name AS "PRODUCT_NAME", wp.category,
        wi.weight AS "WEIGHT", wi.receive_date AS "RECEIVE_DATE", wi.status AS "STATUS"
      FROM warehouse_inventory wi
      JOIN warehouse_products wp ON wi.product_id=wp.id
      JOIN warehouse_prefixes wp2 ON wi.prefix_id=wp2.id
      WHERE wi.id=$1
    `, [numericId]);
    if (!rows.length) return res.json({ success: false, error: 'ไม่พบรหัสนี้ในระบบ' });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.withdrawInventory = async (req, res) => {
  const { id, amount, reason } = req.body;
  if (!id || !amount) return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบ' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE warehouse_inventory SET status='WITHDRAWN' WHERE id=$1 AND status='IN_STOCK'`, [id]
    );
    if (!rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ success: false, error: 'ไม่สามารถเบิกได้ หรือเบิกไปแล้ว' }); }
    await client.query(`INSERT INTO warehouse_withdrawals (inventory_id,amount,reason) VALUES ($1,$2,$3)`, [id, amount, reason || '']);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

module.exports = exports;
