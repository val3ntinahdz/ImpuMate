'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  database: process.env.DB_NAME     || 'impumate_dev',
  user:     process.env.DB_USER     || 'postgres',
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  password: process.env.DB_PASSWORD || '1234',
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error:', err.message);
});

module.exports = pool;
