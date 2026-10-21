import type { RetrievalService } from './retrieval.service.js';
import type { VectorRetrievalService } from './vector-retrieval.service.js';
import { evaluationQuestionRepository } from '../repositories/evaluation-question.repository.js';
import { db } from '@repo/db';
import type { RetrievalConfiguration } from '../types/search.js';
import type { SearchResult } from '../types/search.js';
import type { ExpectedEvidenceRecord } from '../types/evaluation.js';

export interface EvaluationConfig {
  datasetVersion?: string;
  retrievalBudget?: number;
  embeddingModel?: string;
  embeddingDimensions?: number;
  embeddingLatencyIncluded?: boolean;
  configurations?: RetrievalConfiguration[];
}

export interface QuestionEvaluationResult {
  questionId: string;
  configuration: RetrievalConfiguration;
  returnedMemoryIds: string[];
  returnedResourceIds: string[];
  firstRelevantRank: number | null;
  recallAt3: number | null;
  mrr: number | null;
  evidenceCorrect: boolean | null;
  abstained: boolean;
  latencyMs: number;
  rawOutcome: SearchResult[];
}

export interface EvaluationRunResult {
  runId: string;
  datasetVersion: string;
  totalQuestions: number;
  configurations: RetrievalConfiguration[];
  results: QuestionEvaluationResult[];
  aggregateMetrics: Record<RetrievalConfiguration, {
    recallAt3: number;
    mrr: number;
    avgLatencyMs: number;
    questionsAnswered: number;
    questionsAbstained: number;
  }>;
}

export class EvaluationService {
  public constructor(
    private readonly bm25Service: RetrievalService,
    private readonly vectorService: VectorRetrievalService | null,
  ) {}

  public async runEvaluation(config: EvaluationConfig = {}): Promise<EvaluationRunResult> {
    const datasetVersion = config.datasetVersion ?? 'v1.0';
    const retrievalBudget = config.retrievalBudget ?? 10;
    const configurations = config.configurations ?? ['E1', 'E2'];
    const embeddingModel = config.embeddingModel ?? 'fake-embedding-model';
    const embeddingDimensions = config.embeddingDimensions ?? 3072;
    const embeddingLatencyIncluded = config.embeddingLatencyIncluded ?? false;

    const questions = await evaluationQuestionRepository.findAll(datasetVersion);
    if (questions.length === 0) {
      throw new Error(`No evaluation questions found for dataset version: ${datasetVersion}`);
    }

    // Create experiment run
    const runId = crypto.randomUUID();
    await db.orm.public.ExperimentRun.create({
      id: runId,
      datasetVersion,
      retrievalBudget: { topK: retrievalBudget },
      embeddingModel,
      embeddingDimensions,
      embeddingLatencyIncluded,
      startedAt: new Date().toISOString(),
    });

    const allResults: QuestionEvaluationResult[] = [];

    for (const question of questions) {
      const expectedEvidence = await evaluationQuestionRepository.findExpectedEvidence(question.id);
      const expectedResourceIds = [...new Set(expectedEvidence.map((e) => e.resourceId))];

      for (const configuration of configurations) {
        const start = process.hrtime.bigint();

        try {
          let results: SearchResult[] = [];

          if (configuration === 'E1') {
            const searchResults = await this.bm25Service.search({ query: question.question, limit: retrievalBudget });
            results = [...searchResults];
          } else if (configuration === 'E2' && this.vectorService) {
            const searchResults = await this.vectorService.search({ query: question.question, limit: retrievalBudget });
            results = [...searchResults];
          } else {
            // E3, E4, E5 not implemented yet
            results = [];
          }

          const end = process.hrtime.bigint();
          const latencyMs = Number(end - start) / 1_000_000;

          const returnedResourceIds = [...new Set(results.map((r) => r.resourceId))];
          const returnedMemoryIds = results.map((r) => r.memoryId);

          // Calculate metrics
          const { firstRelevantRank, recallAt3, mrr } = this.calculateMetrics(
            returnedResourceIds,
            expectedResourceIds,
          );

          // Determine if abstained (no results or no relevant results)
          const abstained = results.length === 0 || firstRelevantRank === null;

          const result: QuestionEvaluationResult = {
            questionId: question.id,
            configuration,
            returnedMemoryIds,
            returnedResourceIds,
            firstRelevantRank,
            recallAt3,
            mrr,
            evidenceCorrect: null, // Manual audit required
            abstained,
            latencyMs: Math.round(latencyMs),
            rawOutcome: results,
          };

          allResults.push(result);

          // Persist experiment result
          await db.orm.public.ExperimentResult.create({
            id: crypto.randomUUID(),
            runId,
            questionId: question.id,
            configuration,
            returnedMemoryIds,
            returnedResourceIds,
            firstRelevantRank,
            recallAt3,
            mrr,
            evidenceCorrect: null,
            abstained,
            latencyMs: Math.round(latencyMs),
            rawOutcome: results as unknown as SearchResult[],
          });
        } catch (error) {
          const end = process.hrtime.bigint();
          const latencyMs = Number(end - start) / 1_000_000;

          const result: QuestionEvaluationResult = {
            questionId: question.id,
            configuration,
            returnedMemoryIds: [],
            returnedResourceIds: [],
            firstRelevantRank: null,
            recallAt3: 0,
            mrr: 0,
            evidenceCorrect: null,
            abstained: true,
            latencyMs: Math.round(latencyMs),
            rawOutcome: [],
          };

          allResults.push(result);

          await db.orm.public.ExperimentResult.create({
            id: crypto.randomUUID(),
            runId,
            questionId: question.id,
            configuration,
            returnedMemoryIds: [],
            returnedResourceIds: [],
            firstRelevantRank: null,
            recallAt3: 0,
            mrr: 0,
            evidenceCorrect: null,
            abstained: true,
            latencyMs: Math.round(latencyMs),
            rawOutcome: [],
          });
        }
      }
    }

    // Update run completion using raw SQL to avoid Prisma ORM type issues
    try {
      const plan = db.raw.sql`
        UPDATE "public"."experiment_runs"
        SET "completedAt" = ${new Date().toISOString()}
        WHERE "id" = ${runId}
      `.returnsRow({
        dummy: 'pg/int4@1',
      }).build();

      await db.runtime().query(plan);
    } catch {
      // Ignore update errors - run might already be completed
    }

    // Calculate aggregate metrics
    const aggregateMetrics = this.calculateAggregateMetrics(allResults, configurations);

    return {
      runId,
      datasetVersion,
      totalQuestions: questions.length,
      configurations,
      results: allResults,
      aggregateMetrics,
    };
  }

  private calculateMetrics(
    returnedResourceIds: string[],
    expectedResourceIds: string[],
  ): { firstRelevantRank: number | null; recallAt3: number; mrr: number } {
    if (expectedResourceIds.length === 0) {
      return { firstRelevantRank: null, recallAt3: 0, mrr: 0 };
    }

    let firstRelevantRank: number | null = null;
    let relevantCount = 0;

    for (let i = 0; i < Math.min(returnedResourceIds.length, 3); i++) {
      const resourceId = returnedResourceIds[i];
      if (resourceId === undefined) {
        continue;
      }
      if (expectedResourceIds.includes(resourceId)) {
        if (firstRelevantRank === null) {
          firstRelevantRank = i + 1;
        }
        relevantCount++;
      }
    }

    const recallAt3 = relevantCount / expectedResourceIds.length;
    const mrr = firstRelevantRank !== null ? 1 / firstRelevantRank : 0;

    return { firstRelevantRank, recallAt3, mrr };
  }

  private calculateAggregateMetrics(
    results: QuestionEvaluationResult[],
    configurations: RetrievalConfiguration[],
  ): Record<RetrievalConfiguration, {
    recallAt3: number;
    mrr: number;
    avgLatencyMs: number;
    questionsAnswered: number;
    questionsAbstained: number;
  }> {
    const metrics: Record<string, any> = {};

    for (const config of configurations) {
      const configResults = results.filter((r) => r.configuration === config);
      const answerableResults = configResults.filter((r) => !r.abstained);

      const recallAt3 = configResults.length > 0
        ? configResults.reduce((sum, r) => sum + (r.recallAt3 ?? 0), 0) / configResults.length
        : 0;

      const mrr = configResults.length > 0
        ? configResults.reduce((sum, r) => sum + (r.mrr ?? 0), 0) / configResults.length
        : 0;

      const avgLatencyMs = configResults.length > 0
        ? configResults.reduce((sum, r) => sum + r.latencyMs, 0) / configResults.length
        : 0;

      const questionsAnswered = answerableResults.length;
      const questionsAbstained = configResults.filter((r) => r.abstained).length;

      metrics[config] = {
        recallAt3: Math.round(recallAt3 * 10000) / 10000,
        mrr: Math.round(mrr * 10000) / 10000,
        avgLatencyMs: Math.round(avgLatencyMs),
        questionsAnswered,
        questionsAbstained,
      };
    }

    return metrics as Record<RetrievalConfiguration, any>;
  }
}
