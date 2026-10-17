#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/71bdee96ea37e2776888675cfb70891e6b162da65c67620dfcc4d39461640884/contract';
import endContract from '../../snapshots/71bdee96ea37e2776888675cfb70891e6b162da65c67620dfcc4d39461640884/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'evaluation_questions',
        columns: [
          col('answerability', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('datasetVersion', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expectedAnswer', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('question', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'evaluation_questions_answerability_check_9f469c72',
            sql`"answerability" IN ('answerable', 'unanswerable')`,
          ),
          checkExpression(
            'evaluation_questions_category_check_ef07b59c',
            sql`"category" IN ('direct_fact', 'resource_identification', 'cross_resource', 'temporal', 'unanswerable')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'expected_evidence',
        columns: [
          col('evidence', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isPrimary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('memoryId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('questionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'experiment_results',
        columns: [
          col('abstained', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('configuration', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('evidenceCorrect', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('firstRelevantRank', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('latencyMs', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mrr', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('questionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rawOutcome', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('recallAt3', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('returnedMemoryIds', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('returnedResourceIds', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('runId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'experiment_results_configuration_check_344f8627',
            sql`"configuration" IN ('E1', 'E2', 'E3', 'E4', 'E5')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'experiment_runs',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('datasetVersion', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('embeddingDimensions', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('embeddingLatencyIncluded', 'bool', {
            notNull: true,
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('embeddingModel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('retrievalBudget', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'memory_edges',
        columns: [
          col('confidence', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('evidenceText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provenance', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('relation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceMemoryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('targetMemoryId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'memory_edges_provenance_check_b333fb7a',
            sql`"provenance" IN ('verified', 'generated', 'unverified')`,
          ),
          checkExpression(
            'memory_edges_relation_check_486cb71d',
            sql`"relation" IN ('related_to', 'supports', 'contradicts', 'derived_from', 'same_entity')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'memory_items',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('embedding', 'vector(1536)', {
            codecRef: { codecId: 'pg/vector@1', typeParams: { length: 1536 } },
          }),
          col('embeddingDimensions', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('embeddingModel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('entities', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('evidenceEnd', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('evidenceStart', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('evidenceText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('provenance', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('representation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('resourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'memory_items_provenance_check_b333fb7a',
            sql`"provenance" IN ('verified', 'generated', 'unverified')`,
          ),
          checkExpression(
            'memory_items_representation_check_14f9306a',
            sql`"representation" IN ('raw', 'summary', 'fact')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'resources',
        columns: [
          col('content', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('contentHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'resources_type_check_6214cf08',
            sql`"type" IN ('note', 'webpage', 'youtube_transcript', 'github_readme', 'paper_excerpt', 'other')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'expected_evidence',
        constraint: 'expected_evidence_questionId_resourceId_evidence_key',
        columns: ['questionId', 'resourceId', 'evidence'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'experiment_results',
        constraint: 'experiment_results_runId_questionId_configuration_key',
        columns: ['runId', 'questionId', 'configuration'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'memory_edges',
        constraint: 'memory_edges_sourceMemoryId_targetMemoryId_relation_key',
        columns: ['sourceMemoryId', 'targetMemoryId', 'relation'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'evaluation_questions',
        index: 'evaluation_questions_datasetVersion_idx_40434891',
        columns: ['datasetVersion'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'expected_evidence',
        index: 'expected_evidence_memoryId_idx_343972a2',
        columns: ['memoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'expected_evidence',
        index: 'expected_evidence_questionId_idx_fdb42076',
        columns: ['questionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'expected_evidence',
        index: 'expected_evidence_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'experiment_results',
        index: 'experiment_results_questionId_idx_fdb42076',
        columns: ['questionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'experiment_results',
        index: 'experiment_results_runId_idx_a6016437',
        columns: ['runId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'experiment_runs',
        index: 'experiment_runs_datasetVersion_idx_40434891',
        columns: ['datasetVersion'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory_edges',
        index: 'memory_edges_sourceMemoryId_idx_bf0fa4d7',
        columns: ['sourceMemoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory_edges',
        index: 'memory_edges_targetMemoryId_idx_99eabd88',
        columns: ['targetMemoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory_items',
        index: 'memory_items_representation_idx_26308a09',
        columns: ['representation'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory_items',
        index: 'memory_items_resourceId_idx_72964925',
        columns: ['resourceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'memory_items',
        index: 'memory_items_resourceId_representation_idx_87f96ad7',
        columns: ['resourceId', 'representation'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'resources',
        index: 'resources_type_idx_b6b604ea',
        columns: ['type'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'expected_evidence',
        foreignKey: {
          name: 'expected_evidence_questionId_fkey',
          columns: ['questionId'],
          references: { schema: 'public', table: 'evaluation_questions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'expected_evidence',
        foreignKey: {
          name: 'expected_evidence_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'resources', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'expected_evidence',
        foreignKey: {
          name: 'expected_evidence_memoryId_fkey',
          columns: ['memoryId'],
          references: { schema: 'public', table: 'memory_items', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'experiment_results',
        foreignKey: {
          name: 'experiment_results_runId_fkey',
          columns: ['runId'],
          references: { schema: 'public', table: 'experiment_runs', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'experiment_results',
        foreignKey: {
          name: 'experiment_results_questionId_fkey',
          columns: ['questionId'],
          references: { schema: 'public', table: 'evaluation_questions', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memory_edges',
        foreignKey: {
          name: 'memory_edges_sourceMemoryId_fkey',
          columns: ['sourceMemoryId'],
          references: { schema: 'public', table: 'memory_items', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memory_edges',
        foreignKey: {
          name: 'memory_edges_targetMemoryId_fkey',
          columns: ['targetMemoryId'],
          references: { schema: 'public', table: 'memory_items', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'memory_items',
        foreignKey: {
          name: 'memory_items_resourceId_fkey',
          columns: ['resourceId'],
          references: { schema: 'public', table: 'resources', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
