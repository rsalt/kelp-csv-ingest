'use strict';

const fs = require('fs');
const { parse } = require('csv-parse');
const { getPool } = require('./db');
const { flatToNested, nestedToDbRow, validateHeaders } = require('./nested');

async function insertBatch(client, rows) {
  if (rows.length === 0) return;
  const placeholders = [];
  const values = [];
  let n = 1;
  for (const r of rows) {
    placeholders.push(`($${n++}, $${n++}, $${n++}, $${n++})`);
    values.push(r.name, r.age, r.address, r.additional_info);
  }
  await client.query(
    `INSERT INTO public.users (name, age, address, additional_info) VALUES ${placeholders.join(',')}`,
    values,
  );
}

async function ingestFromCsv(opts) {
  const { databaseUrl, csvFilePath, batchSize } = opts;
  if (!csvFilePath || !fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  const pool = getPool(databaseUrl);
  const parser = fs.createReadStream(csvFilePath, { encoding: 'utf8' }).pipe(
    parse({
      columns: (header) => {
        const trimmed = header.map((h) => String(h).trim());
        validateHeaders(trimmed);
        return trimmed;
      },
      relax_column_count: true,
      trim: true,
      bom: true,
      skip_empty_lines: true,
    }),
  );

  const buffer = [];
  let inserted = 0;
  const client = await pool.connect();

  const flush = async () => {
    if (buffer.length === 0) return;
    await client.query('BEGIN');
    try {
      await insertBatch(client, buffer);
      inserted += buffer.length;
      buffer.length = 0;
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    }
  };

  try {
    for await (const record of parser) {
      buffer.push(nestedToDbRow(flatToNested(record)));
      if (buffer.length >= batchSize) await flush();
    }
    await flush();
  } finally {
    client.release();
  }

  return { inserted };
}

module.exports = { ingestFromCsv };
