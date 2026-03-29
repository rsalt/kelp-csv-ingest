'use strict';

const path = require('path');
const express = require('express');
const config = require('./config');
const { ingestFromCsv } = require('./ingest');
const { getAgeDistribution, logAgeDistribution } = require('./report');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/report', async (_req, res) => {
    try {
      const report = await getAgeDistribution(config.databaseUrl);
      res.json({ ok: true, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Report failed' });
    }
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
      const report = await getAgeDistribution(config.databaseUrl);
      logAgeDistribution(report);
      res.json({ ok: true, inserted, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: err.message || 'Ingest failed',
      });
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
