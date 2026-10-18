import { db } from './prisma/db.js';

export type DatabaseHealth = {
  database: boolean;
  pgvector: boolean;
};

export type HealthRow = {
  connected: number;
  vectorInstalled: boolean;
};

export type HealthRowQuery = () => Promise<HealthRow | undefined>;

export function toDatabaseHealth(row: HealthRow | undefined): DatabaseHealth {
  return {
    database: row?.connected === 1,
    pgvector: row?.vectorInstalled === true,
  };
}

async function queryHealthRow(): Promise<HealthRow | undefined> {
  const plan = db.raw.sql`
    SELECT
      1 AS "connected",
      EXISTS (
        SELECT 1
        FROM pg_extension
        WHERE extname = 'vector'
      ) AS "vectorInstalled"
  `
    .returnsRow({
      connected: 'pg/int4@1',
      vectorInstalled: 'pg/bool@1',
    })
    .build();

  const [row] = await db.runtime().query<HealthRow>(plan);
  return row;
}

/**
 * Reports whether the database is reachable and the pgvector extension is
 * installed. The row query is injectable so the mapping can be tested without
 * a live database.
 */
export async function checkDatabaseHealth(
  query: HealthRowQuery = queryHealthRow,
): Promise<DatabaseHealth> {
  return toDatabaseHealth(await query());
}
