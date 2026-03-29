'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const express = require('express');
const multer = require('multer');

const config = require('./config');
const { ingestFromCsv } = require('./ingest');
const { getAgeDistribution, logAgeDistribution } = require('./report');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 52 * 1024 * 1024 },
});

function isPathInsideTmpdir(filePath) {
  const rel = path.relative(os.tmpdir(), path.resolve(filePath));
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'kelp-csv-ingest' });
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
      res.status(400).json({
        error:
          'CSV_FILE_PATH is not set on the server. Upload a file instead (POST /api/ingest/upload) or set CSV_FILE_PATH.',
      });
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

  app.post('/api/ingest/upload', upload.single('csv'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Use form field name "csv".' });
      return;
    }
    const tmpPath = req.file.path;
    if (!isPathInsideTmpdir(tmpPath)) {
      res.status(400).json({ error: 'Invalid upload path.' });
      return;
    }
    try {
      const { inserted } = await ingestFromCsv({
        databaseUrl: config.databaseUrl,
        csvFilePath: tmpPath,
        batchSize: config.batchSize,
      });
      const report = await getAgeDistribution(config.databaseUrl);
      logAgeDistribution(report);
      res.json({ ok: true, inserted, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Ingest failed' });
    } finally {
      if (isPathInsideTmpdir(tmpPath)) {
        try {
          await fs.unlink(tmpPath);
        } catch (_) {
          /* ignore */
        }
      }
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use((err, _req, res, _next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'File too large (max ~52 MB).' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

  return app;
}

module.exports = { createApp };
