'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { ingestFromCsv } = require('./ingest');
const { printAgeDistribution } = require('./report');
const { closePool } = require('./db');

async function maybeIngestOnStart() {
  if (!config.ingestOnStart || !config.csvFilePath) return;
  const { inserted } = await ingestFromCsv({
    databaseUrl: config.databaseUrl,
    csvFilePath: config.csvFilePath,
    batchSize: config.batchSize,
  });
  console.log(`Ingested ${inserted} rows from ${config.csvFilePath}`);
  await printAgeDistribution(config.databaseUrl);
}

async function main() {
  await maybeIngestOnStart();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`Listening on http://localhost:${config.port}`);
    console.log('POST /api/ingest — load CSV from CSV_FILE_PATH and print age report');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `Port ${config.port} is already in use. Stop the other process or set PORT=3001 in .env`,
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  const shutdown = async () => {
    server.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

