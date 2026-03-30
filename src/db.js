'use strict';

const { Pool } = require('pg');

let pool;

/**
 * Initializes and returns a PostgreSQL connection pool.
 */
function getPool(databaseUrl) {
  if (!pool) {
    const useSsl = process.env.DATABASE_SSL !== 'false';
    
    const config = {
      connectionString: databaseUrl,
      max: 10,
    };

    // Cloud providers like Render/Heroku require SSL for connection.
    if (useSsl) {
      config.ssl = {
        rejectUnauthorized: false
      };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected database error:', err);
    });
  }
  return pool;
}

/**
 * Gracefully closes the database pool.
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool };
