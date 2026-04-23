const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_PGC_USER,
  host: process.env.DB_PGC_HOST,
  database: process.env.DB_PGC_DATABASE,
  password: process.env.DB_PGC_PASSWORD,
  port: process.env.DB_PGC_PORT,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};