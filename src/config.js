'use strict';

require('dotenv').config();

const path = require('path');

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: required('DATABASE_URL'),
  csvFilePath: process.env.CSV_FILE_PATH
    ? path.resolve(process.env.CSV_FILE_PATH)
    : null,
  ingestOnStart: String(process.env.INGEST_ON_START || '').toLowerCase() === 'true',
  batchSize: Math.min(Math.max(Number(process.env.INGEST_BATCH_SIZE) || 1000, 100), 5000),
};
