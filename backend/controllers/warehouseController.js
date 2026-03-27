// controllers/warehouseController.js
const { pool } = require('../config/database');

// ════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ════════════════════════════════════════════════════════════════════
const dateClause = (query, field, params) => {
  const { filter, date, month, year } = query;
  if (filter === 'daily' && date) {
    params.push(date);
    return `AND DATE(${field}) = $${params.length}`;
  }
  if (filter === 'monthly' && month) {
    params.push(month);
    return `AND TO_CHAR(${field}, 'YYYY-MM') = $${params.length}`;
  }
  if (filter === 'yearly' && year) {
    params.push(year);
    return `AND TO_CHAR(${field}, 'YYYY') = $${params.length}`;
  }
  return '';
};

const catClause = (query, alias, params) => {
  if (query.category && query.category !== 'all') {
    params.push(query.category);
    return `AND ${alias}.category = $${params.length}`;
  }
  return '';
};

// ════════════════════════════════════════════════════════════════════
// STATS    GET /api/admin/warehouse/stats
// ════════════════════════════════════════════════════════════════════
exports.getStats = async (req, res) => {
  try {
    const p = [];
    const dc = dateClause(req.query, 'wd.withdraw_date', p);
    const cc = catClause(req.query, 'wp', p);

    const [totalR, stockR, weightR, todayR, withdrawnR, valueR] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS v FROM warehouse_products`),
      pool.query(`SELECT COUNT(*) AS v FROM warehouse_inventory WHERE status = 'IN_STOCK'`),
      pool.query(`SELECT COALESCE(SUM(weight),0) AS v FROM warehouse_inventory WHERE status = 'IN_STOCK'`),
      pool.query(`SELECT COUNT(*) AS v FROM warehouse_withdrawals WHERE DATE(withdraw_date) = CURRENT_DATE`),
      pool.query(
        `SELECT COALESCE(SUM(wd.amount),0) AS v
         FROM warehouse_withdrawals wd
         JOIN warehouse_inventory  i  ON wd.inventory_id = i.id
         JOIN warehouse_products   wp ON i.product_id    = wp.id
         WHERE 1=1 ${dc} ${cc}`,
        p
      ),
      pool.query(
        `SELECT COALESCE(SUM(i.weight * COALESCE(wp.price_per_gram,0)),0) AS v
         FROM warehouse_inventory i
         JOIN warehouse_products  wp ON i.product_id = wp.id
         WHERE i.status = 'IN_STOCK'`
      ),
    ]);

    res.json({
      success: true,
      stats: {
        total_products:    +totalR.rows[0].v,
        in_stock:          +stockR.rows[0].v,
        total_weight_g:    +weightR.rows[0].v,
        today_withdrawals: +todayR.rows[0].v,
        total_withdrawn_g: +withdrawnR.rows[0].v,
        total_value:       +valueR.rows[0].v,
      },
    });
  } catch (err) {
    console.error('[getStats]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// REPORT — monthly bar chart (dashboard)
// ════════════════════════════════════════════════════════════════════
exports.getMonthlyReport = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        TO_CHAR(m.month, 'YYYY-MM')  AS month,
        TO_CHAR(m.month, 'Mon YYYY') AS label,
        COALESCE((
          SELECT SUM(
            i.weight + COALESCE(
              (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i.id), 0
            )
          )
          FROM warehouse_inventory i
          WHERE DATE_TRUNC('month', i.receive_date::timestamp) = m.month
        ), 0) AS received_g,
        COALESCE((
          SELECT SUM(wd.amount)
          FROM warehouse_withdrawals wd
          WHERE DATE_TRUNC('month', wd.withdraw_date) = m.month
        ), 0) AS withdrawn_g
      FROM (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'
        ) AS month
      ) m
      ORDER BY m.month
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[getMonthlyReport]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// REPORT — stock by category
// ════════════════════════════════════════════════════════════════════
exports.getStockByCategory = async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        wp.category,
        COUNT(i.id)  FILTER (WHERE i.status = 'IN_STOCK')               AS items_in_stock,
        COALESCE(SUM(i.weight) FILTER (WHERE i.status = 'IN_STOCK'), 0) AS weight_g
      FROM warehouse_products wp
      LEFT JOIN warehouse_inventory i ON i.product_id = wp.id
      GROUP BY wp.category
      ORDER BY weight_g DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[getStockByCategory]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// INVENTORY LIST    GET /api/admin/warehouse/inventory
// ════════════════════════════════════════════════════════════════════
exports.getInventory = async (req, res) => {
  try {
    const p  = [];
    const dc = dateClause(req.query, 'i.receive_date', p);
    const cc = catClause(req.query, 'wp', p);

    const { rows } = await pool.query(
      `SELECT
         i.id,
         i.inventory_code                                          AS code,
         wp.name,
         wp.category,
         i.weight,
         (i.weight + COALESCE(
           (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
         ))                                                        AS original_weight,
         TO_CHAR(i.receive_date,'DD/MM/YYYY')                     AS receive_date,
         i.status,
         (CURRENT_DATE - i.receive_date)                           AS days_in_stock
       FROM warehouse_inventory i
       JOIN warehouse_products  wp ON i.product_id = wp.id
       WHERE i.status = 'IN_STOCK' ${dc} ${cc}
       ORDER BY i.receive_date DESC`,
      p
    );
    res.json({ success: true, inventory: rows });
  } catch (err) {
    console.error('[getInventory]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// INVENTORY BY ID   GET /api/admin/warehouse/inventory/:id
// ════════════════════════════════════════════════════════════════════
exports.getInventoryById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         i.id,
         i.inventory_code                                          AS code,
         wp.name,
         wp.category,
         i.weight,
         (i.weight + COALESCE(
           (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
         ))                                                        AS original_weight,
         TO_CHAR(i.receive_date,'DD/MM/YYYY')                     AS receive_date,
         i.status,
         (CURRENT_DATE - i.receive_date)                           AS days_in_stock
       FROM warehouse_inventory i
       JOIN warehouse_products  wp ON i.product_id = wp.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบรายการ' });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[getInventoryById]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// DELETE INVENTORY   DELETE /api/admin/warehouse/inventory/:id
// ════════════════════════════════════════════════════════════════════
exports.deleteInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM warehouse_withdrawals WHERE inventory_id = $1', [req.params.id]);
    const { rows } = await client.query(
      'DELETE FROM warehouse_inventory WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'ไม่พบรายการ' });
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'ลบรายการสำเร็จ' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[deleteInventory]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally { client.release(); }
};

// ════════════════════════════════════════════════════════════════════
// WITHDRAWALS LIST   GET /api/admin/warehouse/withdrawals
// ════════════════════════════════════════════════════════════════════
exports.getWithdrawals = async (req, res) => {
  try {
    const p  = [];
    const dc = dateClause(req.query, 'wd.withdraw_date', p);
    const cc = catClause(req.query, 'wp', p);

    const { rows } = await pool.query(
      `SELECT
         wd.id,
         i.inventory_code                                    AS code,
         wp.name,
         wp.category,
         wd.amount,
         TO_CHAR(wd.withdraw_date,'DD/MM/YYYY HH24:MI')     AS withdraw_date,
         wd.reason,
         (CURRENT_DATE - DATE(wd.withdraw_date))             AS days_ago
       FROM warehouse_withdrawals wd
       JOIN warehouse_inventory   i  ON wd.inventory_id = i.id
       JOIN warehouse_products    wp ON i.product_id    = wp.id
       WHERE 1=1 ${dc} ${cc}
       ORDER BY wd.withdraw_date DESC`,
      p
    );
    res.json({ success: true, withdrawals: rows });
  } catch (err) {
    console.error('[getWithdrawals]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// DELETE WITHDRAWAL   DELETE /api/admin/warehouse/withdrawals/:id
// ════════════════════════════════════════════════════════════════════
exports.deleteWithdrawal = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM warehouse_withdrawals WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบรายการเบิก' });
    res.json({ success: true, message: 'ลบประวัติการเบิกสำเร็จ' });
  } catch (err) {
    console.error('[deleteWithdrawal]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// UNDO WITHDRAWAL   DELETE /api/admin/warehouse/withdrawal/:id/undo
// ════════════════════════════════════════════════════════════════════
exports.undoWithdrawal = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: wdRows } = await client.query(
      'SELECT inventory_id, amount FROM warehouse_withdrawals WHERE id = $1',
      [req.params.id]
    );
    if (!wdRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'ไม่พบรายการเบิก' });
    }
    const { inventory_id, amount } = wdRows[0];
    await client.query(
      `UPDATE warehouse_inventory SET weight = weight + $1, status = 'IN_STOCK' WHERE id = $2`,
      [amount, inventory_id]
    );
    await client.query('DELETE FROM warehouse_withdrawals WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'ยกเลิกการเบิกสำเร็จ น้ำหนักคืนคลังแล้ว' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[undoWithdrawal]', err);
    res.status(500).json({ success: false, error: err.message });
  } finally { client.release(); }
};

// ════════════════════════════════════════════════════════════════════
// WITHDRAW   POST /api/admin/warehouse/withdraw
// ════════════════════════════════════════════════════════════════════
exports.withdraw = async (req, res) => {
  const { id, amount, reason } = req.body;
  if (!id || !amount)
    return res.status(400).json({ success: false, error: 'กรุณาระบุ id และ amount' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, weight, status FROM warehouse_inventory WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (!rows.length)                   throw new Error('ไม่พบรายการในคลัง');
    if (rows[0].status !== 'IN_STOCK')  throw new Error('วัตถุดิบนี้ถูกเบิกออกหมดแล้ว');
    if (+amount > +rows[0].weight)
      throw new Error(`จำนวนที่เบิก (${amount} ก.) เกินน้ำหนักที่มี (${rows[0].weight} ก.)`);

    await client.query(
      `INSERT INTO warehouse_withdrawals (inventory_id, amount, reason, withdraw_date)
       VALUES ($1, $2, $3, NOW())`,
      [id, amount, reason || null]
    );

    const newWeight = +rows[0].weight - +amount;
    if (newWeight <= 0) {
      await client.query(
        `UPDATE warehouse_inventory SET weight = 0, status = 'WITHDRAWN' WHERE id = $1`, [id]
      );
    } else {
      await client.query(
        `UPDATE warehouse_inventory SET weight = $1 WHERE id = $2`, [newWeight, id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'เบิกวัตถุดิบสำเร็จ', remaining_weight: newWeight });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[withdraw]', err);
    res.status(400).json({ success: false, error: err.message });
  } finally { client.release(); }
};

// ════════════════════════════════════════════════════════════════════
// SEARCH   POST /api/admin/warehouse/search
// ════════════════════════════════════════════════════════════════════
exports.searchInventory = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: 'กรุณาระบุรหัส' });
  try {
    const { rows } = await pool.query(
      `SELECT
         i.id                                    AS "INVENTORY_ID",
         i.inventory_code                        AS "INVENTORY_CODE",
         wp.name                                 AS "PRODUCT_NAME",
         wp.category                             AS "CATEGORY",
         i.weight                                AS "WEIGHT",
         TO_CHAR(i.receive_date,'DD/MM/YYYY')    AS "RECEIVE_DATE",
         i.status                                AS "STATUS"
       FROM warehouse_inventory i
       JOIN warehouse_products  wp ON i.product_id = wp.id
       WHERE UPPER(i.inventory_code) = UPPER($1)`,
      [code.trim()]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, error: `ไม่พบรหัส "${code}"` });
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[searchInventory]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// GENERATE QR   POST /api/admin/warehouse/generate-qr
// ════════════════════════════════════════════════════════════════════
exports.generateQR = async (req, res) => {
  const { prefixCode, productId, weight, receiveDate } = req.body;
  if (!prefixCode || !productId || !weight || !receiveDate)
    return res.status(400).json({ success: false, error: 'ข้อมูลไม่ครบ (prefixCode, productId, weight, receiveDate)' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE warehouse_inventory IN SHARE ROW EXCLUSIVE MODE');

    const { rows: prodRows } = await client.query(
      'SELECT id, name, category FROM warehouse_products WHERE id = $1', [productId]
    );
    if (!prodRows.length) throw new Error('ไม่พบประเภทวัตถุดิบ');

    const { rows: pfRows } = await client.query(
      `INSERT INTO warehouse_prefixes (prefix_code, description)
       VALUES (UPPER($1), $2)
       ON CONFLICT (prefix_code) DO UPDATE SET prefix_code = EXCLUDED.prefix_code
       RETURNING id`,
      [prefixCode.toUpperCase(), `${prodRows[0].category} — ${prodRows[0].name} (auto)`]
    );

    const { rows: seqRows } = await client.query(
      `SELECT COALESCE(MAX(
         CAST(NULLIF(REGEXP_REPLACE(inventory_code, '^[^-]+-', ''), '') AS INTEGER)
       ), 0) AS max_seq
       FROM warehouse_inventory
       WHERE UPPER(inventory_code) LIKE UPPER($1)`,
      [prefixCode.toUpperCase() + '-%']
    );

    const nextSeq       = +seqRows[0].max_seq + 1;
    const inventoryCode = `${prefixCode.toUpperCase()}-${String(nextSeq).padStart(6, '0')}`;

    await client.query(
      `INSERT INTO warehouse_inventory (product_id, prefix_id, weight, receive_date, status, inventory_code)
       VALUES ($1, $2, $3, $4, 'IN_STOCK', $5)`,
      [productId, pfRows[0].id, weight, receiveDate, inventoryCode]
    );

    await client.query('COMMIT');

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const pageUrl = `${FRONTEND_URL}/ingredient/${inventoryCode}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pageUrl)}`;

    res.json({ success: true, inventoryId: inventoryCode, productName: prodRows[0].name, weight, receiveDate, qrUrl });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[generateQR]', err);
    res.status(400).json({ success: false, error: err.message });
  } finally { client.release(); }
};

// ════════════════════════════════════════════════════════════════════
// WAREHOUSE PRODUCTS
// ════════════════════════════════════════════════════════════════════
exports.getWarehouseProducts = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, category, price_per_gram FROM warehouse_products ORDER BY category, name'
    );
    res.json(rows);
  } catch (err) {
    console.error('[getWarehouseProducts]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createWarehouseProduct = async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category)
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อและหมวดหมู่' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO warehouse_products (name, category) VALUES ($1, $2) RETURNING id, name, category',
      [name.trim(), category.trim()]
    );
    res.json({ success: true, product: rows[0] });
  } catch (err) {
    console.error('[createWarehouseProduct]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteWarehouseProduct = async (req, res) => {
  try {
    const { rows: chk } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM warehouse_inventory WHERE product_id = $1', [req.params.id]
    );
    if (+chk[0].cnt > 0)
      return res.status(400).json({ success: false, error: 'ไม่สามารถลบได้ มีรายการคลังอ้างอิงอยู่' });
    const { rows } = await pool.query(
      'DELETE FROM warehouse_products WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบวัตถุดิบ' });
    res.json({ success: true, message: 'ลบวัตถุดิบสำเร็จ' });
  } catch (err) {
    console.error('[deleteWarehouseProduct]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// PREFIXES
// ════════════════════════════════════════════════════════════════════
exports.getPrefixes = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, prefix_code AS code, description FROM warehouse_prefixes ORDER BY prefix_code`
    );
    res.json(rows);
  } catch (err) {
    console.error('[getPrefixes]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createPrefix = async (req, res) => {
  const { code, description } = req.body;
  if (!code || !description)
    return res.status(400).json({ success: false, error: 'กรุณาระบุ code และ description' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO warehouse_prefixes (prefix_code, description) VALUES (UPPER($1), $2)
       RETURNING id, prefix_code AS code, description`,
      [code.trim(), description.trim()]
    );
    res.json({ success: true, prefix: rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, error: `Prefix "${code.toUpperCase()}" มีอยู่แล้ว` });
    console.error('[createPrefix]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updatePrefix = async (req, res) => {
  const { description } = req.body;
  if (!description)
    return res.status(400).json({ success: false, error: 'กรุณาระบุ description' });
  try {
    const { rows } = await pool.query(
      `UPDATE warehouse_prefixes SET description = $1 WHERE id = $2
       RETURNING id, prefix_code AS code, description`,
      [description.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบ Prefix' });
    res.json({ success: true, prefix: rows[0] });
  } catch (err) {
    console.error('[updatePrefix]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deletePrefix = async (req, res) => {
  try {
    const { rows: chk } = await pool.query(
      'SELECT COUNT(*) AS cnt FROM warehouse_inventory WHERE prefix_id = $1', [req.params.id]
    );
    if (+chk[0].cnt > 0)
      return res.status(400).json({ success: false, error: 'ไม่สามารถลบได้ มีรายการคลังใช้ Prefix นี้อยู่' });
    const { rows } = await pool.query(
      'DELETE FROM warehouse_prefixes WHERE id = $1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'ไม่พบ Prefix' });
    res.json({ success: true, message: 'ลบ Prefix สำเร็จ' });
  } catch (err) {
    console.error('[deletePrefix]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPublicIngredient = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.inventory_code, wp.name, wp.category, i.weight, i.receive_date, i.status
     FROM warehouse_inventory i
     JOIN warehouse_products wp ON i.product_id = wp.id
     WHERE UPPER(i.inventory_code) = UPPER($1)`,
    [req.params.code]
  );
  if (!rows.length) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
  res.json({ success: true, item: rows[0] });
};

// ════════════════════════════════════════════════════════════════════
// REPORT — DAILY   GET /api/admin/warehouse/report/daily?date=YYYY-MM-DD
// ════════════════════════════════════════════════════════════════════
exports.getDailyReport = async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const [receivedR, withdrawnR, topR] = await Promise.all([
      pool.query(
        `SELECT
           wp.name,
           wp.category,
           i.inventory_code AS code,
           i.weight,
           (i.weight + COALESCE(
             (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
           )) AS original_weight,
           TO_CHAR(i.receive_date,'DD/MM/YYYY') AS receive_date
         FROM warehouse_inventory i
         JOIN warehouse_products wp ON i.product_id = wp.id
         WHERE DATE(i.receive_date) = $1
         ORDER BY i.receive_date DESC`,
        [date]
      ),
      pool.query(
        `SELECT
           wp.name,
           wp.category,
           i.inventory_code AS code,
           wd.amount,
           wd.reason,
           TO_CHAR(wd.withdraw_date,'DD/MM/YYYY HH24:MI') AS withdraw_date
         FROM warehouse_withdrawals wd
         JOIN warehouse_inventory  i  ON wd.inventory_id = i.id
         JOIN warehouse_products   wp ON i.product_id    = wp.id
         WHERE DATE(wd.withdraw_date) = $1
         ORDER BY wd.withdraw_date DESC`,
        [date]
      ),
      pool.query(
        `SELECT
           wp.category,
           COALESCE((
             SELECT SUM(
               i2.weight + COALESCE(
                 (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i2.id), 0
               )
             )
             FROM warehouse_inventory i2
             WHERE i2.product_id = wp.id
               AND DATE(i2.receive_date) = $1
           ), 0) AS received_g,
           COALESCE((
             SELECT SUM(wd.amount)
             FROM warehouse_withdrawals wd
             JOIN warehouse_inventory i3 ON wd.inventory_id = i3.id
             WHERE i3.product_id = wp.id
               AND DATE(wd.withdraw_date) = $1
           ), 0) AS withdrawn_g
         FROM warehouse_products wp
         ORDER BY wp.category`,
        [date]
      ),
    ]);

    res.json({
      success: true,
      date,
      summary: {
        total_received_items:  receivedR.rows.length,
        total_received_g:      receivedR.rows.reduce((s, r) => s + +r.original_weight, 0),
        total_withdrawn_items: withdrawnR.rows.length,
        total_withdrawn_g:     withdrawnR.rows.reduce((s, r) => s + +r.amount, 0),
      },
      received:    receivedR.rows,
      withdrawn:   withdrawnR.rows,
      by_category: topR.rows,
    });
  } catch (err) {
    console.error('[getDailyReport]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// REPORT — MONTHLY DETAIL   GET /api/admin/warehouse/report/monthly-detail?month=YYYY-MM
// ════════════════════════════════════════════════════════════════════
exports.getMonthlyDetailReport = async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    const [summaryR, dailyR, categoryR, topR, receivedR, withdrawnR] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(
             i.weight + COALESCE(
               (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
             )
           ), 0) AS total_received_g,
           COUNT(DISTINCT i.id) AS total_received_items
         FROM warehouse_inventory i
         WHERE TO_CHAR(i.receive_date,'YYYY-MM') = $1`,
        [month]
      ),
      // รับเข้า/เบิกออก รายวันในเดือน — แก้แล้ว ไม่มี row multiplication
      pool.query(
        `SELECT
           TO_CHAR(d.day,'DD/MM/YYYY') AS date,
           COALESCE((
             SELECT SUM(
               i.weight + COALESCE(
                 (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i.id), 0
               )
             )
             FROM warehouse_inventory i
             WHERE DATE(i.receive_date) = d.day
           ), 0) AS received_g,
           COALESCE((
             SELECT SUM(wd3.amount)
             FROM warehouse_withdrawals wd3
             WHERE DATE(wd3.withdraw_date) = d.day
           ), 0) AS withdrawn_g
         FROM (
           SELECT generate_series(
             DATE_TRUNC('month', $1::date),
             (DATE_TRUNC('month', $1::date) + INTERVAL '1 month - 1 day')::date,
             '1 day'
           )::date AS day
         ) d
         ORDER BY d.day`,
        [month + '-01']
      ),
      // สรุปตามหมวดหมู่ — แก้แล้ว ไม่มี row multiplication
      pool.query(
        `SELECT
           wp.category,
           COALESCE((
             SELECT SUM(
               i2.weight + COALESCE(
                 (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i2.id), 0
               )
             )
             FROM warehouse_inventory i2
             WHERE i2.product_id = wp.id
               AND TO_CHAR(i2.receive_date,'YYYY-MM') = $1
           ), 0) AS received_g,
           COALESCE((
             SELECT SUM(wd.amount)
             FROM warehouse_withdrawals wd
             JOIN warehouse_inventory i3 ON wd.inventory_id = i3.id
             WHERE i3.product_id = wp.id
               AND TO_CHAR(wd.withdraw_date,'YYYY-MM') = $1
           ), 0) AS withdrawn_g
         FROM warehouse_products wp
         ORDER BY received_g DESC`,
        [month]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           COALESCE(SUM(wd.amount), 0) AS withdrawn_g,
           COUNT(wd.id)                AS withdraw_count
         FROM warehouse_products wp
         LEFT JOIN warehouse_inventory   i  ON i.product_id    = wp.id
         LEFT JOIN warehouse_withdrawals wd ON wd.inventory_id = i.id
           AND TO_CHAR(wd.withdraw_date,'YYYY-MM') = $1
         GROUP BY wp.name, wp.category
         HAVING COALESCE(SUM(wd.amount), 0) > 0
         ORDER BY withdrawn_g DESC
         LIMIT 10`,
        [month]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           i.inventory_code AS code,
           i.weight,
           (i.weight + COALESCE(
             (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
           )) AS original_weight,
           TO_CHAR(i.receive_date,'DD/MM/YYYY') AS receive_date
         FROM warehouse_inventory i
         JOIN warehouse_products wp ON i.product_id = wp.id
         WHERE TO_CHAR(i.receive_date,'YYYY-MM') = $1
         ORDER BY i.receive_date DESC`,
        [month]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           i.inventory_code AS code,
           wd.amount,
           wd.reason,
           TO_CHAR(wd.withdraw_date,'DD/MM/YYYY HH24:MI') AS withdraw_date
         FROM warehouse_withdrawals wd
         JOIN warehouse_inventory  i  ON wd.inventory_id = i.id
         JOIN warehouse_products   wp ON i.product_id    = wp.id
         WHERE TO_CHAR(wd.withdraw_date,'YYYY-MM') = $1
         ORDER BY wd.withdraw_date DESC`,
        [month]
      ),
    ]);

    res.json({
      success: true,
      month,
      summary: {
        total_received_g:     +summaryR.rows[0].total_received_g,
        total_received_items: +summaryR.rows[0].total_received_items,
      },
      daily:         dailyR.rows,
      by_category:   categoryR.rows,
      top_withdrawn: topR.rows,
      received:      receivedR.rows,
      withdrawn:     withdrawnR.rows,
    });
  } catch (err) {
    console.error('[getMonthlyDetailReport]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// REPORT — YEARLY   GET /api/admin/warehouse/report/yearly?year=YYYY
// ════════════════════════════════════════════════════════════════════
exports.getYearlyReport = async (req, res) => {
  try {
    const year = req.query.year || String(new Date().getFullYear());

    const [monthlyR, categoryR, topR, receivedR, withdrawnR] = await Promise.all([
      // รับเข้า/เบิกออก รายเดือนในปี — แก้แล้ว ไม่มี row multiplication
      pool.query(
        `SELECT
           TO_CHAR(m.month,'Mon') AS label,
           TO_CHAR(m.month,'MM')  AS month_num,
           COALESCE((
             SELECT SUM(
               i.weight + COALESCE(
                 (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i.id), 0
               )
             )
             FROM warehouse_inventory i
             WHERE DATE_TRUNC('month', i.receive_date::timestamp) = m.month
           ), 0) AS received_g,
           COALESCE((
             SELECT SUM(wd.amount)
             FROM warehouse_withdrawals wd
             WHERE DATE_TRUNC('month', wd.withdraw_date) = m.month
           ), 0) AS withdrawn_g
         FROM (
           SELECT generate_series(
             ($1 || '-01-01')::date,
             ($1 || '-12-01')::date,
             '1 month'
           )::date AS month
         ) m
         ORDER BY m.month`,
        [year]
      ),
      // สรุปตามหมวดหมู่ทั้งปี — แก้แล้ว ไม่มี row multiplication
      pool.query(
        `SELECT
           wp.category,
           COALESCE((
             SELECT SUM(
               i2.weight + COALESCE(
                 (SELECT SUM(wd2.amount) FROM warehouse_withdrawals wd2 WHERE wd2.inventory_id = i2.id), 0
               )
             )
             FROM warehouse_inventory i2
             WHERE i2.product_id = wp.id
               AND TO_CHAR(i2.receive_date,'YYYY') = $1
           ), 0) AS received_g,
           COALESCE((
             SELECT SUM(wd.amount)
             FROM warehouse_withdrawals wd
             JOIN warehouse_inventory i3 ON wd.inventory_id = i3.id
             WHERE i3.product_id = wp.id
               AND TO_CHAR(wd.withdraw_date,'YYYY') = $1
           ), 0) AS withdrawn_g
         FROM warehouse_products wp
         ORDER BY received_g DESC`,
        [year]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           COALESCE(SUM(wd.amount), 0) AS withdrawn_g,
           COUNT(wd.id)                AS withdraw_count
         FROM warehouse_products wp
         LEFT JOIN warehouse_inventory   i  ON i.product_id    = wp.id
         LEFT JOIN warehouse_withdrawals wd ON wd.inventory_id = i.id
           AND TO_CHAR(wd.withdraw_date,'YYYY') = $1
         GROUP BY wp.name, wp.category
         HAVING COALESCE(SUM(wd.amount), 0) > 0
         ORDER BY withdrawn_g DESC
         LIMIT 10`,
        [year]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           i.inventory_code AS code,
           i.weight,
           (i.weight + COALESCE(
             (SELECT SUM(wd.amount) FROM warehouse_withdrawals wd WHERE wd.inventory_id = i.id), 0
           )) AS original_weight,
           TO_CHAR(i.receive_date,'DD/MM/YYYY') AS receive_date
         FROM warehouse_inventory i
         JOIN warehouse_products wp ON i.product_id = wp.id
         WHERE TO_CHAR(i.receive_date,'YYYY') = $1
         ORDER BY i.receive_date DESC`,
        [year]
      ),
      pool.query(
        `SELECT
           wp.name, wp.category,
           i.inventory_code AS code,
           wd.amount,
           wd.reason,
           TO_CHAR(wd.withdraw_date,'DD/MM/YYYY HH24:MI') AS withdraw_date
         FROM warehouse_withdrawals wd
         JOIN warehouse_inventory  i  ON wd.inventory_id = i.id
         JOIN warehouse_products   wp ON i.product_id    = wp.id
         WHERE TO_CHAR(wd.withdraw_date,'YYYY') = $1
         ORDER BY wd.withdraw_date DESC`,
        [year]
      ),
    ]);

    res.json({
      success: true,
      year,
      monthly:       monthlyR.rows,
      by_category:   categoryR.rows,
      top_withdrawn: topR.rows,
      received:      receivedR.rows,
      withdrawn:     withdrawnR.rows,
    });
  } catch (err) {
    console.error('[getYearlyReport]', err);
    res.status(500).json({ success: false, error: err.message });
  }
};