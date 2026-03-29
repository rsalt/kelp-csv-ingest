'use strict';

const { Pool } = require('pg');

// Local DB: set DATABASE_SSL=false in .env. Render / Neon: leave DATABASE_SSL unset (uses TLS).
function pgOptions(url) {
  const useSsl = process.env.DATABASE_SSL !== 'false';
  return {
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  };
}

let pool;

function getPool(databaseUrl) {
  if (!pool) {
    pool = new Pool({ ...pgOptions(databaseUrl), max: 10 });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool, pgOptions };
