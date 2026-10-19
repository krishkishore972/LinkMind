import type { Request, Response } from 'express';
import { z } from 'zod';
import type { EvaluationService } from '../services/evaluation.service.js';
import type { RetrievalConfiguration } from '../types/search.js';

const runEvaluationSchema = z.object({
  datasetVersion: z.string().optional(),
  retrievalBudget: z.number().int().positive().max(50).optional(),
  embeddingModel: z.string().optional(),
  embeddingDimensions: z.number().int().positive().optional(),
  embeddingLatencyIncluded: z.boolean().optional(),
  configurations: z.array(z.enum(['E1', 'E2', 'E3', 'E4', 'E5'])).optional(),
});

const runIdSchema = z.string().uuid();

interface RunResponse {
  id: string;
  datasetVersion: string;
  retrievalBudget: unknown;
  embeddingModel: string | null;
  embeddingDimensions: number | null;
  embeddingLatencyIncluded: boolean;
  startedAt: string;
  completedAt: string | null;
  results: Array<{
    id: string;
    questionId: string;
    configuration: RetrievalConfiguration;
    returnedMemoryIds: unknown;
    returnedResourceIds: unknown;
    firstRelevantRank: number | null;
    recallAt3: number | null;
    mrr: number | null;
    evidenceCorrect: boolean | null;
    abstained: boolean;
    latencyMs: number;
    rawOutcome: unknown;
  }> | null;
}

export class EvaluationController {
  public constructor(private readonly evaluationService: EvaluationService) {}

  public run = async (request: Request, response: Response): Promise<void> => {
    const parsed = runEvaluationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await this.evaluationService.runEvaluation(parsed.data);
      response.status(200).json({ result });
    } catch (error) {
      console.error('Evaluation run error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  public listRuns = async (_request: Request, response: Response): Promise<void> => {
    try {
      const runs = await this.listRunsInternal();
      response.status(200).json({ runs });
    } catch (error) {
      console.error('List runs error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  public getRun = async (request: Request, response: Response): Promise<void> => {
    const runId = request.params.id as string;
    const parsed = runIdSchema.safeParse(runId);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const run = await this.getRunById(parsed.data);
      if (!run) {
        response.status(404).json({ error: 'run_not_found' });
        return;
      }
      response.status(200).json({ run });
    } catch (error) {
      console.error('Get run error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  public getRunCsv = async (request: Request, response: Response): Promise<void> => {
    const runId = request.params.id as string;
    const parsed = runIdSchema.safeParse(runId);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const csv = await this.getRunCsvData(parsed.data);
      if (!csv) {
        response.status(404).json({ error: 'run_not_found' });
        return;
      }
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', `attachment; filename="evaluation-run-${runId}.csv"`);
      response.status(200).send(csv);
    } catch (error) {
      console.error('Get run CSV error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };

  private async getRunById(runId: string): Promise<RunResponse | null> {
    const { db } = await import('@repo/db');
    const run = await db.orm.public.ExperimentRun.first({ id: runId });
    if (!run) {
      return null;
    }

    const results = await db.orm.public.ExperimentResult.where({ runId }).all();

    return {
      id: run.id,
      datasetVersion: run.datasetVersion,
      retrievalBudget: run.retrievalBudget,
      embeddingModel: run.embeddingModel,
      embeddingDimensions: run.embeddingDimensions,
      embeddingLatencyIncluded: run.embeddingLatencyIncluded,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      results: results.map((r) => ({
        id: r.id,
        questionId: r.questionId,
        configuration: r.configuration,
        returnedMemoryIds: r.returnedMemoryIds,
        returnedResourceIds: r.returnedResourceIds,
        firstRelevantRank: r.firstRelevantRank,
        recallAt3: r.recallAt3,
        mrr: r.mrr,
        evidenceCorrect: r.evidenceCorrect,
        abstained: r.abstained ?? false,
        latencyMs: r.latencyMs,
        rawOutcome: r.rawOutcome,
      })),
    };
  }

  private async listRunsInternal() {
    const { db } = await import('@repo/db');
    const runs = await db.orm.public.ExperimentRun.orderBy((r) => r.startedAt.desc()).all();

    return runs.map((r) => ({
      id: r.id,
      datasetVersion: r.datasetVersion,
      retrievalBudget: r.retrievalBudget,
      embeddingModel: r.embeddingModel,
      embeddingDimensions: r.embeddingDimensions,
      embeddingLatencyIncluded: r.embeddingLatencyIncluded,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    }));
  }

  private async getRunCsvData(runId: string): Promise<string | null> {
    const { db } = await import('@repo/db');
    const run = await db.orm.public.ExperimentRun.first({ id: runId });
    if (!run) {
      return null;
    }

    const results = await db.orm.public.ExperimentResult.where({ runId }).all();

    const questions = await db.orm.public.EvaluationQuestion.where({ datasetVersion: run.datasetVersion }).all();
    const questionMap = new Map(questions.map((q) => [q.id, q.question]));

    const headers = [
      'run_id',
      'question_id',
      'question',
      'configuration',
      'returned_memory_ids',
      'returned_resource_ids',
      'first_relevant_rank',
      'recall_at_3',
      'mrr',
      'evidence_correct',
      'abstained',
      'latency_ms',
    ];

    const rows = results.map((r) => [
      run.id,
      r.questionId,
      questionMap.get(r.questionId) ?? '',
      r.configuration,
      JSON.stringify(r.returnedMemoryIds),
      JSON.stringify(r.returnedResourceIds),
      r.firstRelevantRank ?? '',
      r.recallAt3 ?? '',
      r.mrr ?? '',
      r.evidenceCorrect ?? '',
      r.abstained ? 'true' : 'false',
      r.latencyMs,
    ]);

    const csvRows = [headers, ...rows].map((row) => row.map(escapeCsv).join(','));
    return csvRows.join('\n');
  }
}

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}