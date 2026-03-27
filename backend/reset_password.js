const bcrypt = require('bcrypt');
const { pool } = require('./config/database');

async function resetAdminPassword() {
    const newEmail = 'admin@test.com';  // ← เปลี่ยน email
    const newPassword = 'admin123';           // ← เปลี่ยน password
    const hash = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
        `UPDATE users 
         SET password = $1, email = $2 
         WHERE role = 'admin' 
         RETURNING email`,
        [hash, newEmail]
    );
    
    if (result.rows.length === 0) {
        console.log('❌ ไม่พบ admin user');
    } else {
        console.log('✅ เปลี่ยนสำเร็จ!');
        console.log('📧 Email ใหม่:', result.rows[0].email);
        console.log('🔑 รหัสใหม่:', newPassword);
    }
    
    process.exit(0);
}

resetAdminPassword().catch(console.error);