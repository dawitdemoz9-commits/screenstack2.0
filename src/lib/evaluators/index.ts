// ─── Evaluator Plugin Registry ────────────────────────────────────────────────
// Each evaluator receives a question config and a candidate answer,
// and returns a ScoringResult. New evaluators can be added here without
// changing any other part of the system.

import type { ScoringResult } from '@/types';
import { multipleChoiceEvaluator } from './multiple-choice';
import { multiSelectEvaluator }    from './multi-select';
import { codeEvaluator }           from './code';
import { sqlEvaluator }            from './sql';
import { manualEvaluator }         from './manual';

export type EvaluatorFn = (
  config: Record<string, unknown>,
  answer: Record<string, unknown>,
  points: number,
  scoringRules: Record<string, unknown>
) => Promise<ScoringResult>;

// Registry: evaluator name → function
const EVALUATORS: Record<string, EvaluatorFn> = {
  multiple_choice: multipleChoiceEvaluator,
  multi_select:    multiSelectEvaluator,
  code:            codeEvaluator,
  sql:             sqlEvaluator,
  manual:          manualEvaluator,
  scenario:        manualEvaluator, // scenarios are manually scored
};

export async function evaluate(
  evaluatorName: string,
  config: Record<string, unknown>,
  answer: Record<string, unknown>,
  points: number,
  scoringRules: Record<string, unknown> = {}
): Promise<ScoringResult> {
  const fn = EVALUATORS[evaluatorName] ?? manualEvaluator;
  return fn(config, answer, points, scoringRules);
}

export { EVALUATORS };
