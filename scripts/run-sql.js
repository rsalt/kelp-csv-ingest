'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ override: true });

const { pgOptions } = require('../src/db');

const sqlDir = path.resolve(__dirname, '..', 'sql');
const full = path.join(sqlDir, 'init.sql');

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  const sql = fs.readFileSync(full, 'utf8');
  const client = new Client(pgOptions(url));
  await client.connect();
  try {
    await client.query(sql);
    console.log('OK:', full);
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

