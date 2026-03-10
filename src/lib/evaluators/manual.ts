import type { ScoringResult } from '@/types';
import type { EvaluatorFn } from './index';

// ─── Manual Evaluator ─────────────────────────────────────────────────────────
// Used for short answer, long answer, scenario, architecture questions.
// Returns a placeholder result and flags for recruiter review.

export const manualEvaluator: EvaluatorFn = async (
  _config,
  answer,
  points
): Promise<ScoringResult> => {
  const text = (answer.text as string) || '';

  if (!text.trim()) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'No answer provided.',
      requiresManualReview: false,
    };
  }

  // Word count heuristic for provisional score
  const wordCount = text.trim().split(/\s+/).length;
  const hasMinContent = wordCount >= 10;

  return {
    score: hasMinContent ? Math.round(points * 0.5) : 0, // provisional 50%
    maxScore: points,
    isCorrect: null, // unknown until reviewed
    feedback: 'Answer received. Pending recruiter review for scoring.',
    requiresManualReview: true,
  };
};
