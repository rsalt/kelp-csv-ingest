'use strict';

const { Pool } = require('pg');

const CLOUD = /\.render\.com|neon\.tech|supabase\.co|railway\.app/i;
const LOCAL = /localhost|127\.0\.0\.1/i;

function pgOptions(url) {
  const cloud = CLOUD.test(url);
  const local = LOCAL.test(url) && !cloud;
  const userWantsSslOff = process.env.DATABASE_SSL === 'false';

  // Render etc. require TLS — ignore DATABASE_SSL=false for cloud URLs (common shell mistake).
  if (userWantsSslOff && local) {
    return { connectionString: url, ssl: false };
  }

  return {
    connectionString: url,
    ssl: { rejectUnauthorized: false },
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
