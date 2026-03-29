'use strict';

const express = require('express');
const config = require('./config');
const { ingestFromCsv } = require('./ingest');
const { printAgeDistribution } = require('./report');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/ingest', async (_req, res) => {
    if (!config.csvFilePath) {
      res.status(400).json({ error: 'CSV_FILE_PATH is not set' });
      return;
    }
    try {
      const { inserted } = await ingestFromCsv({
        databaseUrl: config.databaseUrl,
        csvFilePath: config.csvFilePath,
        batchSize: config.batchSize,
      });
      await printAgeDistribution(config.databaseUrl);
      res.json({ ok: true, inserted });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || 'Ingest failed',
      });
    }
  });

  return app;
}

module.exports = { createApp };
