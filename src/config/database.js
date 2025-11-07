const { Pool } = require('pg');
require('dotenv').config();

const nutechDbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = nutechDbPool;