#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/71bdee96ea37e2776888675cfb70891e6b162da65c67620dfcc4d39461640884/contract';
import startContract from '../../snapshots/71bdee96ea37e2776888675cfb70891e6b162da65c67620dfcc4d39461640884/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7779c20909cdd156723430544e0579482da247fc0ddfa9e24c0ef01ed9432083/contract';
import endContract from '../../snapshots/7779c20909cdd156723430544e0579482da247fc0ddfa9e24c0ef01ed9432083/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'memory_items',
        column: col('chunkIndex', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'memory_items',
        constraint: 'memory_items_resourceId_representation_chunkIndex_key',
        columns: ['resourceId', 'representation', 'chunkIndex'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
