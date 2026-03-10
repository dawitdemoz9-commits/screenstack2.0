import type { ScoringResult } from '@/types';
import type { EvaluatorFn } from './index';

export const multipleChoiceEvaluator: EvaluatorFn = async (
  config,
  answer,
  points
): Promise<ScoringResult> => {
  const correct = config.correct as string;
  const selected = answer.selected as string;

  if (!selected) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'No answer provided.',
      requiresManualReview: false,
    };
  }

  const isCorrect = selected === correct;

  return {
    score: isCorrect ? points : 0,
    maxScore: points,
    isCorrect,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. The correct answer was: ${correct}. ${(config.explanation as string) || ''}`,
    requiresManualReview: false,
  };
};
