'use strict';

const fs = require('fs');
const { parse } = require('csv-parse');
const { getPool } = require('./db');

/**
 * Validates that the first three columns are name.firstName, name.lastName, and age.
 */
function validateHeaders(headers) {
  const mandatory = ['name.firstName', 'name.lastName', 'age'];
  for (let i = 0; i < mandatory.length; i++) {
    const h = String(headers[i] || '').trim();
    if (h !== mandatory[i]) {
      throw new Error(`CSV Error: Column ${i + 1} must be "${mandatory[i]}", but found "${h}"`);
    }
  }
}

/**
 * Converts a flat CSV row into a nested JSON object based on dot notation.
 */
function flatToNested(flat) {
  const root = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.').filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  return root;
}

/**
 * Maps a nested object to the database row structure.
 */
function nestedToDbRow(nested) {
  // Join names. Assumption: a space is preferred between first and last name.
  const first = String(nested.name?.firstName || '').trim();
  const last = String(nested.name?.lastName || '').trim();
  const name = `${first} ${last}`.trim();

  if (!name) throw new Error('Incomplete record: Missing name.firstName or name.lastName');

  const age = parseInt(nested.age, 10);
  if (isNaN(age)) throw new Error(`Invalid age value for user ${name}`);

  // The address is a dedicated JSONB column in the schema.
  const address = (nested.address && Object.keys(nested.address).length > 0) ? nested.address : null;

  // Everything else goes into additional_info.
  const extra = { ...nested };
  delete extra.name;
  delete extra.age;
  delete extra.address;

  const additional_info = Object.keys(extra).length > 0 ? extra : null;

  return { name, age, address, additional_info };
}

async function insertBatch(client, rows) {
  if (rows.length === 0) return;

  const placeholders = [];
  const values = [];
  let index = 1;

  for (const row of rows) {
    placeholders.push(`($${index++}, $${index++}, $${index++}, $${index++})`);
    values.push(row.name, row.age, row.address, row.additional_info);
  }

  const query = `INSERT INTO public.users (name, age, address, additional_info) VALUES ${placeholders.join(',')}`;
  await client.query(query, values);
}

async function ingestFromCsv({ databaseUrl, csvFilePath, batchSize = 1000 }) {
  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`File not found: ${csvFilePath}`);
  }

  const pool = getPool(databaseUrl);
  const client = await pool.connect();

  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      columns: (header) => {
        validateHeaders(header);
        return header.map(h => h.trim());
      },
      skip_empty_lines: true,
      trim: true,
      bom: true
    })
  );

  let buffer = [];
  let totalInserted = 0;

  try {
    for await (const record of parser) {
      const nested = flatToNested(record);
      const dbRow = nestedToDbRow(nested);
      buffer.push(dbRow);

      if (buffer.length >= batchSize) {
        await client.query('BEGIN');
        await insertBatch(client, buffer);
        await client.query('COMMIT');
        totalInserted += buffer.length;
        console.log(`... Ingested ${totalInserted} rows so far`);
        buffer = [];
      }
    }

    if (buffer.length > 0) {
      await client.query('BEGIN');
      await insertBatch(client, buffer);
      await client.query('COMMIT');
      totalInserted += buffer.length;
    }

    return { inserted: totalInserted };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { ingestFromCsv };
