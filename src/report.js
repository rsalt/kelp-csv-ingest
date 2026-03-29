'use strict';

const { getPool } = require('./db');

const ORDER = ['< 20', '20 to 40', '40 to 60', '> 60'];

const QUERY = `
  WITH bucketed AS (
    SELECT CASE
      WHEN age < 20 THEN '< 20'
      WHEN age >= 20 AND age <= 40 THEN '20 to 40'
      WHEN age > 40 AND age <= 60 THEN '40 to 60'
      ELSE '> 60'
    END AS age_group
    FROM public.users
  ),
  counts AS (
    SELECT age_group, COUNT(*)::double precision AS cnt FROM bucketed GROUP BY age_group
  ),
  total AS (SELECT COALESCE(SUM(cnt), 0) AS t FROM counts)
  SELECT c.age_group,
    CASE WHEN total.t = 0 THEN 0::numeric
         ELSE ROUND((100.0 * c.cnt / total.t)::numeric, 2)
    END AS pct
  FROM counts c CROSS JOIN total
`;

async function getAgeDistribution(databaseUrl) {
  const pool = getPool(databaseUrl);
  const { rows } = await pool.query(QUERY);
  const map = new Map(rows.map((r) => [r.age_group, Number(r.pct)]));
  return ORDER.map((age_group) => ({ age_group, pct: map.get(age_group) ?? 0 }));
}

function logAgeDistribution(report) {
  console.log('');
  console.log('Age-Group\t% Distribution');
  for (const { age_group, pct } of report) {
    console.log(`${age_group}\t${pct}`);
  }
  console.log('');
}

async function printAgeDistribution(databaseUrl) {
  logAgeDistribution(await getAgeDistribution(databaseUrl));
}

module.exports = { getAgeDistribution, printAgeDistribution, logAgeDistribution };
