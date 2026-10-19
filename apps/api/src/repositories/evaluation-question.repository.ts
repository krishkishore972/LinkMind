import { db } from '@repo/db';
import type {
  CreateEvaluationQuestionInput,
  CreateExpectedEvidenceInput,
  EvaluationQuestionRecord,
  ExpectedEvidenceRecord,
} from '../types/evaluation.js';

export interface EvaluationQuestionRepository {
  findById(id: string): Promise<EvaluationQuestionRecord | null>;
  findAll(datasetVersion?: string): Promise<EvaluationQuestionRecord[]>;
  findExpectedEvidence(questionId: string): Promise<ExpectedEvidenceRecord[]>;
  create(input: CreateEvaluationQuestionInput): Promise<EvaluationQuestionRecord>;
  createExpectedEvidence(input: CreateExpectedEvidenceInput): Promise<ExpectedEvidenceRecord>;
}

export const evaluationQuestionRepository: EvaluationQuestionRepository = {
  async findById(id: string): Promise<EvaluationQuestionRecord | null> {
    const question = await db.orm.public.EvaluationQuestion.first({ id });
    if (!question) {
      return null;
    }
    return {
      id: question.id,
      question: question.question,
      category: question.category,
      answerability: question.answerability,
      expectedAnswer: question.expectedAnswer,
      datasetVersion: question.datasetVersion,
      createdAt: question.createdAt,
    };
  },

  async findAll(datasetVersion?: string): Promise<EvaluationQuestionRecord[]> {
    let questions;
    if (datasetVersion) {
      questions = await db.orm.public.EvaluationQuestion.where({ datasetVersion }).all();
    } else {
      questions = await db.orm.public.EvaluationQuestion.all();
    }
    return questions.map((q) => ({
      id: q.id,
      question: q.question,
      category: q.category,
      answerability: q.answerability,
      expectedAnswer: q.expectedAnswer,
      datasetVersion: q.datasetVersion,
      createdAt: q.createdAt,
    }));
  },

  async findExpectedEvidence(questionId: string): Promise<ExpectedEvidenceRecord[]> {
    const evidence = await db.orm.public.ExpectedEvidence.where({ questionId }).all();
    return evidence.map((e) => ({
      id: e.id,
      questionId: e.questionId,
      resourceId: e.resourceId,
      memoryId: e.memoryId,
      evidence: e.evidence,
      isPrimary: e.isPrimary,
    }));
  },

  async create(input: CreateEvaluationQuestionInput): Promise<EvaluationQuestionRecord> {
    const question = await db.orm.public.EvaluationQuestion.create({
      id: input.id,
      question: input.question,
      category: input.category,
      answerability: input.answerability,
      expectedAnswer: input.expectedAnswer ?? null,
      datasetVersion: input.datasetVersion,
    });
    return {
      id: question.id,
      question: question.question,
      category: question.category,
      answerability: question.answerability,
      expectedAnswer: question.expectedAnswer,
      datasetVersion: question.datasetVersion,
      createdAt: question.createdAt,
    };
  },

  async createExpectedEvidence(input: CreateExpectedEvidenceInput): Promise<ExpectedEvidenceRecord> {
    const evidence = await db.orm.public.ExpectedEvidence.create({
      id: crypto.randomUUID(),
      questionId: input.questionId,
      resourceId: input.resourceId,
      memoryId: input.memoryId ?? null,
      evidence: input.evidence,
      isPrimary: input.isPrimary,
    });
    return {
      id: evidence.id,
      questionId: evidence.questionId,
      resourceId: evidence.resourceId,
      memoryId: evidence.memoryId,
      evidence: evidence.evidence,
      isPrimary: evidence.isPrimary,
    };
  },
};