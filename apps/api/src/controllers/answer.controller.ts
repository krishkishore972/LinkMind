import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AnswerSynthesisService } from '../services/answer-synthesis.service.js';
import type { RetrievalConfiguration } from '../types/search.js';

const answerSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  retrievalBudget: z.number().int().positive().max(50).optional(),
  configurations: z.array(z.enum(['E1', 'E2', 'E3', 'E4', 'E5'])).optional(),
  includeCitations: z.boolean().optional(),
});

export class AnswerController {
  public constructor(private readonly answerService: AnswerSynthesisService) {}

  public generate = async (request: Request, response: Response): Promise<void> => {
    const parsed = answerSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({
        error: 'validation_error',
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const result = await this.answerService.synthesizeAnswer(parsed.data.query, {
        retrievalConfigurations: parsed.data.configurations,
        retrievalBudget: parsed.data.retrievalBudget,
        includeCitations: parsed.data.includeCitations,
      });

      response.status(200).json({ answer: result });
    } catch (error) {
      console.error('Answer generation error:', error);
      response.status(500).json({ error: 'internal_server_error' });
    }
  };
}