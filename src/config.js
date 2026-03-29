'use strict';

require('dotenv').config();
const path = require('path');

function env(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Set ${name} in .env`);
  return v;
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: env('DATABASE_URL'),
  csvFilePath: process.env.CSV_FILE_PATH ? path.resolve(process.env.CSV_FILE_PATH) : null,
  ingestOnStart: String(process.env.INGEST_ON_START || '').toLowerCase() === 'true',
  batchSize: Number(process.env.INGEST_BATCH_SIZE) || 1000,
};
