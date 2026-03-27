const pool = require('./config/database');

async function testDatabase() {
    try {
        console.log('🔗 Testing PostgreSQL connection...');
        
        // Test connection
        const testQuery = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connected successfully!');
        console.log('⏰ Server time:', testQuery.rows[0].current_time);
        
        // Test categories table
        const categoriesResult = await pool.query('SELECT * FROM categories');
        console.log('\n📁 Categories:', categoriesResult.rows.length);
        categoriesResult.rows.forEach(cat => {
            console.log(`  - ${cat.name}`);
        });
        
        // Test products table
        const productsResult = await pool.query(`
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.category_id
            ORDER BY p.created_at DESC
        `);
        console.log('\n📦 Products:', productsResult.rows.length);
        productsResult.rows.forEach(prod => {
            console.log(`  - ${prod.name} (${prod.price} บาท) [${prod.category_name}]`);
        });
        
        console.log('\n✅ All tests passed!');
        
    } catch (error) {
        console.error('\n❌ Database test failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Hint: PostgreSQL is not running. Start PostgreSQL service first.');
        } else if (error.code === '3D000') {
            console.error('\n💡 Hint: Database "shop_db" does not exist. Create it first.');
        } else if (error.code === '42P01') {
            console.error('\n💡 Hint: Table does not exist. Run the SQL schema first.');
        } else if (error.code === '28P01') {
            console.error('\n💡 Hint: Authentication failed. Check DB_USER and DB_PASSWORD in .env');
        }
    } finally {
        await pool.end();
        process.exit();
    }
}

testDatabase();