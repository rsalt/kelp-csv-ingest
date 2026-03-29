'use strict';

function flatToNested(flat) {
  const root = {};
  for (const [key, raw] of Object.entries(flat)) {
    const parts = key.split('.').filter(Boolean);
    if (parts.length === 0) continue;
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] === undefined || typeof cur[p] !== 'object' || cur[p] === null) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = raw;
  }
  return root;
}

function nestedToDbRow(nested) {
  const first = nested.name && nested.name.firstName != null ? String(nested.name.firstName) : '';
  const last = nested.name && nested.name.lastName != null ? String(nested.name.lastName) : '';
  const name = `${first} ${last}`.trim();
  if (!name) throw new Error('Record missing name.firstName / name.lastName');

  const age = Number.parseInt(String(nested.age ?? ''), 10);
  if (!Number.isFinite(age)) throw new Error('Invalid or missing age');

  let address = nested.address;
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    address = Object.keys(address).length ? address : null;
  } else {
    address = null;
  }

  const additional = { ...nested };
  delete additional.name;
  delete additional.age;
  delete additional.address;

  const additional_info = Object.keys(additional).length ? additional : null;
  return { name, age, address, additional_info };
}

const MANDATORY = ['name.firstName', 'name.lastName', 'age'];

function validateHeaders(headers) {
  const h = headers.map((x) => String(x).trim());
  for (let i = 0; i < MANDATORY.length; i++) {
    if (h[i] !== MANDATORY[i]) {
      throw new Error(`Column ${i + 1} must be "${MANDATORY[i]}", got "${h[i] || ''}"`);
    }
  }
}

module.exports = { flatToNested, nestedToDbRow, validateHeaders };
