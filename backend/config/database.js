require('dotenv').config(); // ✅ โหลด .env ก่อนอื่น

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'marketplace_db',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''), // ✅ แปลงเป็น string เสมอ
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log config สำหรับ debug (ลบออกใน production)
console.log('🔍 Database Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ? '***' : 'EMPTY'
});

pool.on('connect', () => {
  console.log('✅ เชื่อมต่อ PostgreSQL สำเร็จ');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

const query = (text, params) => pool.query(text, params);

const initDatabase = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. สร้างตาราง users ก่อน
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        district VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        auth_provider VARCHAR(20) DEFAULT 'local',
        google_id VARCHAR(255),
        facebook_id VARCHAR(255),
        line_id VARCHAR(255),
        profile_image TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        reset_password_token VARCHAR(255),
        reset_password_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง users');

    // 2. สร้าง unique constraints สำหรับ OAuth IDs
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_google_id_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_google_id_key UNIQUE (google_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_facebook_id_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_facebook_id_key UNIQUE (facebook_id);
        END IF;
        
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_line_id_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_line_id_key UNIQUE (line_id);
        END IF;
      END $$;
    `);

    // 3. สร้างตาราง addresses (ขึ้นกับ users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        label VARCHAR(50),
        name VARCHAR(255),
        phone VARCHAR(50),
        address TEXT NOT NULL,
        district VARCHAR(100),
        amphoe VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง addresses');

    // 4. สร้างตาราง categories
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง categories');

    // 5. สร้างตาราง products
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
        image_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง products');

    // 6. สร้างตาราง orders (ขึ้นกับ users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        shipping_address TEXT,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง orders');

    // 7. สร้างตาราง order_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        price_at_time DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง order_items');

    // 8. สร้างตาราง payments (ขึ้นกับ orders และ users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        transaction_id VARCHAR(255),
        payment_details JSONB,
        slip_url TEXT,
        paid_at TIMESTAMP,
        expires_at TIMESTAMP,
        refund JSONB,
        note TEXT,
        verified_by INTEGER REFERENCES users(user_id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ สร้างตาราง payments');
// 9. สร้างตาราง promotions
await client.query(`
  CREATE TABLE IF NOT EXISTS promotions (
    promotion_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percent', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(500),
    product_id INTEGER REFERENCES products(product_id) ON DELETE SET NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✅ สร้างตาราง promotions');

// 10. สร้างตาราง promotion_banners
await client.query(`
  CREATE TABLE IF NOT EXISTS promotion_banners (
    banner_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✅ สร้างตาราง promotion_banners');
    // 9. สร้าง unique constraint สำหรับ transaction_id
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'payments_transaction_id_key'
        ) THEN
          ALTER TABLE payments ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);
        END IF;
      END $$;
    `);

    // 10. สร้าง indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
    `);
    console.log('✅ สร้าง indexes');

    await client.query('COMMIT');
    console.log('✅ สร้างตารางฐานข้อมูลสำเร็จทั้งหมด');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ ไม่สามารถสร้างตารางฐานข้อมูล:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, initDatabase };
