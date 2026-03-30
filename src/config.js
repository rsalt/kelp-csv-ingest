'use strict';

const path = require('path');

require('dotenv').config({ override: true });

const csvEnv = process.env.CSV_FILE_PATH;
const defaultCsvPath = path.join(__dirname, '..', 'data', 'sample.csv');

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  csvFilePath: path.resolve(csvEnv || defaultCsvPath),
  batchSize: parseInt(process.env.INGEST_BATCH_SIZE, 10) || 1000,
  ingestOnStart: process.env.INGEST_ON_START === 'true',
};

// Simple validation to ensure the essential DB URL is present
if (!config.databaseUrl) {
  console.error('CRITICAL ERROR: DATABASE_URL is not defined in .env');
  process.exit(1);
}

module.exports = config;
