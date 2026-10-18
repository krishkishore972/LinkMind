export type QuestionCategory =
  | 'direct_fact'
  | 'resource_identification'
  | 'cross_resource'
  | 'temporal'
  | 'unanswerable';

export type Answerability = 'answerable' | 'unanswerable';

export type EvaluationQuestionRecord = {
  id: string;
  question: string;
  category: QuestionCategory;
  answerability: Answerability;
  expectedAnswer: string | null;
  datasetVersion: string;
  createdAt: string;
};

export type ExpectedEvidenceRecord = {
  id: string;
  questionId: string;
  resourceId: string;
  memoryId: string | null;
  evidence: string;
  isPrimary: boolean;
};

export type CreateEvaluationQuestionInput = {
  id: string;
  question: string;
  category: QuestionCategory;
  answerability: Answerability;
  expectedAnswer: string | null;
  datasetVersion: string;
};

export type CreateExpectedEvidenceInput = {
  questionId: string;
  resourceId: string;
  evidence: string;
  isPrimary: boolean;
  memoryId?: string;
};