import { db } from './prisma/db.js';

export type DatabaseHealth = {
  database: boolean;
  pgvector: boolean;
};

type HealthRow = {
  connected: number;
  vectorInstalled: boolean;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
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

  return {
    database: row?.connected === 1,
    pgvector: row?.vectorInstalled === true,
  };
}
