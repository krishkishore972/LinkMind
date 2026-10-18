import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ResourceRepository } from '../repositories/resource.repository.js';
import type { MemoryRepository } from '../repositories/memory.repository.js';
import type { ResourceService } from './resource.service.js';
import { ResourceMemoryBuilder } from './memory-builder.service.js';
import { evaluationQuestionRepository } from '../repositories/evaluation-question.repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATASET_DIR = join(__dirname, '..', '..', '..', '..', 'dataset');

interface DatasetResource {
  id: string;
  title: string;
  type: string;
  sourceUrl: string | null;
  content: string;
}

interface DatasetQuestions {
  version: string;
  datasetVersion: string;
  questions: Array<{
    id: string;
    question: string;
    category: string;
    answerability: string;
    expectedAnswer: string | null;
    expectedEvidence: Array<{
      resourceId: string;
      evidence: string;
      isPrimary: boolean;
    }>;
  }>;
}

function loadResources(): DatasetResource[] {
  const raw = readFileSync(join(DATASET_DIR, 'resources.json'), 'utf-8');
  const parsed = JSON.parse(raw);
  return parsed.resources;
}

function loadQuestions(): DatasetQuestions {
  const raw = readFileSync(join(DATASET_DIR, 'questions.json'), 'utf-8');
  return JSON.parse(raw);
}

function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export type DemoSeedResult = {
  resourcesCreated: number;
  resourcesSkipped: number;
  questionsCreated: number;
  questionsSkipped: number;
  evidenceCreated: number;
  memoriesBuilt: number;
};

export class DemoSeedService {
  public constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly resourceService: ResourceService,
    private readonly memoryRepository: MemoryRepository,
  ) {}

  public async seed(): Promise<DemoSeedResult> {
    const datasetResources = loadResources();
    const datasetQuestions = loadQuestions();

    let resourcesCreated = 0;
    let resourcesSkipped = 0;

    for (const dsResource of datasetResources) {
      const existing = await this.resourceRepository.findById(dsResource.id);
      if (existing) {
        resourcesSkipped++;
        continue;
      }

      await this.resourceRepository.create({
        id: dsResource.id,
        title: dsResource.title,
        type: dsResource.type as 'note' | 'webpage' | 'youtube_transcript' | 'github_readme' | 'paper_excerpt' | 'other',
        sourceUrl: dsResource.sourceUrl ?? undefined,
        content: dsResource.content,
        contentHash: computeContentHash(dsResource.content),
      });
      resourcesCreated++;
    }

    const builder = new ResourceMemoryBuilder(this.resourceService, this.memoryRepository);
    const rebuildResult = await builder.rebuild();

    let questionsCreated = 0;
    let questionsSkipped = 0;
    let evidenceCreated = 0;

    for (const dsQuestion of datasetQuestions.questions) {
      const existingQuestion = await evaluationQuestionRepository.findById(dsQuestion.id);
      if (existingQuestion) {
        questionsSkipped++;
        continue;
      }

      await evaluationQuestionRepository.create({
        id: dsQuestion.id,
        question: dsQuestion.question,
        category: dsQuestion.category as 'direct_fact' | 'resource_identification' | 'cross_resource' | 'temporal' | 'unanswerable',
        answerability: dsQuestion.answerability as 'answerable' | 'unanswerable',
        expectedAnswer: dsQuestion.expectedAnswer ?? null,
        datasetVersion: datasetQuestions.datasetVersion,
      });
      questionsCreated++;

      for (const evidence of dsQuestion.expectedEvidence) {
        await evaluationQuestionRepository.createExpectedEvidence({
          questionId: dsQuestion.id,
          resourceId: evidence.resourceId,
          evidence: evidence.evidence,
          isPrimary: evidence.isPrimary,
        });
        evidenceCreated++;
      }
    }

    return {
      resourcesCreated,
      resourcesSkipped,
      questionsCreated,
      questionsSkipped,
      evidenceCreated,
      memoriesBuilt: rebuildResult.chunksCreated,
    };
  }
}