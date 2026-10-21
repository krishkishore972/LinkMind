import { db } from '@repo/db';

export interface VectorRepository {
  saveEmbeddings(
    items: readonly { id: string; embedding: number[] }[],
  ): Promise<void>;
  searchSimilar(
    queryVector: number[],
    representation: 'raw' | 'summary' | 'fact',
    limit: number,
  ): Promise<readonly { memoryId: string; score: number }[]>;
}

export const vectorRepository: VectorRepository = {
  async saveEmbeddings(
    items: readonly { id: string; embedding: number[] }[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    for (const item of items) {
      const vectorLiteral = `[${item.embedding.join(',')}]`;
      const plan = db.raw.sql`
        UPDATE "public"."memory_items"
        SET "embedding" = ${vectorLiteral}::vector(3072)
        WHERE "id" = ${item.id}
      `.returnsRow({
        dummy: 'pg/int4@1',
      }).build();

      await db.runtime().query(plan);
    }
  },

  async searchSimilar(
    queryVector: number[],
    representation: 'raw' | 'summary' | 'fact',
    limit: number,
  ): Promise<readonly { memoryId: string; score: number }[]> {
    const vectorLiteral = `[${queryVector.join(',')}]`;

    const plan = db.raw.sql`
      SELECT
        "id" as "memoryId",
        1 - ("embedding" <=> ${vectorLiteral}::vector(3072)) as "score"
      FROM "public"."memory_items"
      WHERE "representation" = ${representation}
        AND "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${vectorLiteral}::vector(3072)
      LIMIT ${limit}
    `.returnsRow({
      memoryId: 'pg/text@1',
      score: 'pg/float8@1',
    }).build();

    const rows = await db.runtime().query<{ memoryId: string; score: number }>(plan);
    return rows;
  },
};
