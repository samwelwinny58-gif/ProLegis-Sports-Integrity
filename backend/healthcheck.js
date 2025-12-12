// healthcheck.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prolegis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 2000,
});

(async function run() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('ok');
    process.exit(0);
  } catch (err) {
    console.error('healthcheck failed:', err.message || err);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
