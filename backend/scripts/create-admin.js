// scripts/create-admin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../database/db');

(async function() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'admin@prolegis.sports';
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PWD || 'ChangeMe123!';
    const firstName = process.env.ADMIN_FIRST_NAME || 'ProLegis';
    const lastName = process.env.ADMIN_LAST_NAME || 'Admin';

    // Check if admin exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length > 0) {
      console.log('Admin user already exists:', adminEmail);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const insertQuery = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, user_type, is_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const id = uuidv4();
    await pool.query(insertQuery, [id, adminEmail, passwordHash, firstName, lastName]);

    console.log('Admin user created:', adminEmail);
    console.log('Please change the password immediately in production.');

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
