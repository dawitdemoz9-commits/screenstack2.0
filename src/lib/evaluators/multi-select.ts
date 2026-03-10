import type { ScoringResult } from '@/types';
import type { EvaluatorFn } from './index';

export const multiSelectEvaluator: EvaluatorFn = async (
  config,
  answer,
  points
): Promise<ScoringResult> => {
  const correct = (config.correct as string[]).sort();
  const selected = ((answer.selected as string[]) || []).sort();
  const partialCredit = (config.partialCredit as boolean) ?? true;

  if (selected.length === 0) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'No answer provided.',
      requiresManualReview: false,
    };
  }

  const correctSet = new Set(correct);
  const selectedSet = new Set(selected);

  // Full match
  if (JSON.stringify(selected) === JSON.stringify(correct)) {
    return {
      score: points,
      maxScore: points,
      isCorrect: true,
      feedback: 'Correct! All correct options selected.',
      requiresManualReview: false,
    };
  }

  if (partialCredit) {
    // Award partial credit: correct selections - wrong selections
    const correctHits = selected.filter((s) => correctSet.has(s)).length;
    const wrongHits = selected.filter((s) => !correctSet.has(s)).length;
    const score = Math.max(0, ((correctHits - wrongHits) / correct.length) * points);

    // Were any correct options missed?
    const missed = correct.filter((c) => !selectedSet.has(c));

    return {
      score: Math.round(score * 10) / 10,
      maxScore: points,
      isCorrect: false,
      feedback: `Partial credit. Correct: ${correctHits}/${correct.length}. ${missed.length > 0 ? `Missed: ${missed.join(', ')}.` : ''}`,
      requiresManualReview: false,
    };
  }

  return {
    score: 0,
    maxScore: points,
    isCorrect: false,
    feedback: `Incorrect. Correct answers were: ${correct.join(', ')}`,
    requiresManualReview: false,
  };
};
