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
  const sql = `
    INSERT INTO public.users (name, age, address, additional_info)
    VALUES ${placeholders.join(',')}
  `;
  await client.query(sql, values);
}

/**
 * Stream CSV from disk and insert in batches.
 * @param {{ databaseUrl: string, csvFilePath: string, batchSize: number }} opts
 * @returns {Promise<{ inserted: number }>}
 */
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

  let buffer = [];
  let inserted = 0;
  const client = await pool.connect();

  try {
    for await (const record of parser) {
      const nested = flatToNested(record);
      buffer.push(nestedToDbRow(nested));

      if (buffer.length >= batchSize) {
        await client.query('BEGIN');
        try {
          await insertBatch(client, buffer);
          inserted += buffer.length;
          buffer = [];
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }
    }

    if (buffer.length > 0) {
      await client.query('BEGIN');
      try {
        await insertBatch(client, buffer);
        inserted += buffer.length;
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    client.release();
  }

  return { inserted };
}

module.exports = { ingestFromCsv };
