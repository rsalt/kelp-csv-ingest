'use strict';

const { getPool } = require('./db');

const AGE_GROUPS = ['< 20', '20 to 40', '40 to 60', '> 60'];

/**
 * Executes a SQL query to calculate the age distribution percentage.
 */
const DISTRIBUTION_QUERY = `
  WITH user_buckets AS (
    SELECT 
      CASE
        WHEN age < 20 THEN '< 20'
        WHEN age BETWEEN 20 AND 40 THEN '20 to 40'
        WHEN age > 40 AND age <= 60 THEN '40 to 60'
        ELSE '> 60'
      END AS group_name
    FROM public.users
  ),
  group_counts AS (
    SELECT group_name, COUNT(*) as count FROM user_buckets GROUP BY group_name
  ),
  total_count AS (
    SELECT COUNT(*) as total FROM public.users
  )
  SELECT 
    b.group_name,
    COALESCE(
      ROUND((COALESCE(c.count, 0) * 100.0) / NULLIF(t.total, 0), 2),
      0
    ) AS percentage
  FROM (SELECT unnest(ARRAY['< 20', '20 to 40', '40 to 60', '> 60']) AS group_name) b
  LEFT JOIN group_counts c ON b.group_name = c.group_name
  CROSS JOIN total_count t
`;

async function getAgeDistribution(databaseUrl) {
  const pool = getPool(databaseUrl);
  const { rows } = await pool.query(DISTRIBUTION_QUERY);
  return rows.map(r => ({ age_group: r.group_name, pct: Number(r.percentage) }));
}

/**
 * Prints the distribution report to the console in the required format.
 */
function logAgeDistribution(report) {
  console.log('\nAge-Group % Distribution');
  for (const item of report) {
    console.log(`${item.age_group.padEnd(15)} ${item.pct}`);
  }
  console.log('');
}

async function printAgeDistribution(databaseUrl) {
  const report = await getAgeDistribution(databaseUrl);
  logAgeDistribution(report);
}

module.exports = { getAgeDistribution, printAgeDistribution, logAgeDistribution };
