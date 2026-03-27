const pool = require('../config/database');

exports.getAllProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            ORDER BY p.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error loading products:', error.message);
        res.status(500).json({ 
            error: 'Server error', 
            message: error.message 
        });
    }
};

exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE p.product_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error loading product by ID:', error.message);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
};

exports.createProduct = async (req, res) => {
    const { 
        name, price, stock, description, category_id, image_url,
        country, size, weight, weight_unit, qr_code 
    } = req.body;

    try {
        const generatedQR = qr_code || `PRD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        const result = await pool.query(
            `INSERT INTO products 
             (name, price, stock, description, category_id, image_url, 
              country, size, weight, weight_unit, qr_code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING *`,
            [name, price, stock, description, category_id, image_url,
             country, size, weight, weight_unit || 'kg', generatedQR]
        );
        
        console.log('✅ Product created:', result.rows[0].product_id);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('❌ Create error:', error.message);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
};

exports.updateProduct = async (req, res) => {

    const { id } = req.params;

    const { 
        name, 
        price, 
        stock, 
        description, 
        category_id, 
        image_url,
        country, 
        size, 
        weight, 
        weight_unit, 
        qr_code 
    } = req.body;

    try {

        const parsedWeight =
            weight === "" || weight === null || weight === undefined
                ? null
                : parseFloat(weight);

        const parsedWeightUnit =
            weight_unit === "" || weight_unit === undefined
                ? "g"
                : weight_unit;

        const result = await pool.query(
            `UPDATE products 
             SET 
                name = COALESCE($1, name),
                price = COALESCE($2, price),
                stock = COALESCE($3, stock),
                description = COALESCE($4, description),
                category_id = COALESCE($5, category_id),
                image_url = COALESCE($6, image_url),
                country = COALESCE($7, country),
                size = COALESCE($8, size),
                weight = COALESCE($9, weight),
                weight_unit = COALESCE($10, weight_unit),
                qr_code = COALESCE($11, qr_code),
                updated_at = CURRENT_TIMESTAMP
             WHERE product_id = $12
             RETURNING *`,
            [
                name,
                price,
                stock,
                description,
                category_id,
                image_url,
                country,
                size,
                parsedWeight,
                parsedWeightUnit,
                qr_code,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        console.log("✅ Updated Product:", result.rows[0]);

        res.json(result.rows[0]);

    } catch (error) {
        console.error("❌ Update product error:", error);
        res.status(500).json({
            error: "Server error",
            message: error.message
        });
    }
};

exports.deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM products WHERE product_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log('✅ Product deleted:', id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('❌ Delete error:', error.message);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
};