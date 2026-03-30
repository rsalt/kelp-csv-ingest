'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const express = require('express');
const multer = require('multer');

const config = require('./config');
const { getPool } = require('./db');
const { ingestFromCsv } = require('./ingest');
const { getAgeDistribution, logAgeDistribution } = require('./report');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/** Multer writes under `os.tmpdir()`; only allow reads/deletes when basename resolves inside temp. */
function resolveTrustedUploadPath(multerPath) {
  const tmp = os.tmpdir();
  const joined = path.join(tmp, path.basename(multerPath));
  if (path.resolve(joined) !== path.resolve(multerPath)) {
    throw new Error('Invalid upload path');
  }
  return joined;
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, status: 'ok' });
  });

  app.get('/api/report', async (_req, res) => {
    try {
      const report = await getAgeDistribution(config.databaseUrl);
      res.json({ ok: true, success: true, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message || 'Failed to generate report' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 100, 1), 500);
      const pool = getPool(config.databaseUrl);
      const { rows } = await pool.query(
        `SELECT id, name, age, address, additional_info
         FROM public.users
         ORDER BY id DESC
         LIMIT $1`,
        [limit],
      );
      res.json({ ok: true, success: true, users: rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message || 'Database query failed' });
    }
  });

  app.post('/api/ingest', async (_req, res) => {
    try {
      const { inserted } = await ingestFromCsv({
        databaseUrl: config.databaseUrl,
        csvFilePath: config.csvFilePath,
        batchSize: config.batchSize,
      });
      const report = await getAgeDistribution(config.databaseUrl);
      logAgeDistribution(report);
      res.json({ ok: true, success: true, inserted, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/ingest/upload', upload.single('csv'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file with the field name "csv"' });
    }

    try {
      const csvPath = resolveTrustedUploadPath(req.file.path);
      const { inserted } = await ingestFromCsv({
        databaseUrl: config.databaseUrl,
        csvFilePath: csvPath,
        batchSize: config.batchSize,
      });
      const report = await getAgeDistribution(config.databaseUrl);
      logAgeDistribution(report);
      res.json({ ok: true, success: true, inserted, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    } finally {
      if (req.file?.path) {
        try {
          const csvPath = resolveTrustedUploadPath(req.file.path);
          await fs.unlink(csvPath);
        } catch (_) {
          /* ignore */
        }
      }
    }
  });

  // Serve static UI if available
  app.use(express.static(path.join(__dirname, '..', 'public')));

  return app;
}

module.exports = { createApp };
