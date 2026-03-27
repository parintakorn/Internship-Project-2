const pool = require('../config/database');

exports.getCart = async (req, res) => {
    const userId = req.user.userId;

    try {
        const result = await pool.query(`
            SELECT ci.cart_item_id, ci.quantity, p.product_id, p.name, p.price
            FROM carts c
            JOIN cart_items ci ON c.cart_id = ci.cart_id
            JOIN products p ON ci.product_id = p.product_id
            WHERE c.user_id = $1
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.addToCart = async (req, res) => {
    const userId = req.user.userId;
    const { product_id, quantity } = req.body;

    try {
        const cartResult = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
        const cartId = cartResult.rows[0].cart_id;

        const existingItem = await pool.query(
            'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2',
            [cartId, product_id]
        );

        if (existingItem.rows.length > 0) {
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1 WHERE cart_id = $2 AND product_id = $3',
                [quantity, cartId, product_id]
            );
        } else {
            await pool.query(
                'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
                [cartId, product_id, quantity]
            );
        }

        res.json({ message: 'Product added to cart' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.removeFromCart = async (req, res) => {
    const { cart_item_id } = req.params;

    try {
        await pool.query('DELETE FROM cart_items WHERE cart_item_id = $1', [cart_item_id]);
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
};