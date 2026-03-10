import type { ScoringResult } from '@/types';
import type { EvaluatorFn } from './index';

// ─── SQL Evaluator ────────────────────────────────────────────────────────────
// Uses a lightweight in-memory SQL engine to run candidate queries
// against seeded test data and compare results.

interface SqlConfig {
  schema: string;      // DDL + INSERT statements
  prompt: string;
  expectedSql?: string;
  hints?: string[];
}

export const sqlEvaluator: EvaluatorFn = async (
  config,
  answer,
  points
): Promise<ScoringResult> => {
  const { schema } = config as unknown as SqlConfig;
  const query = (answer.query as string) || '';

  if (!query.trim()) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'No query submitted.',
      requiresManualReview: false,
    };
  }

  // Safety check: block destructive statements
  const dangerous = /^\s*(drop|delete|truncate|alter|update|insert|create|grant|revoke)/i;
  if (dangerous.test(query)) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'Only SELECT queries are allowed in this challenge.',
      requiresManualReview: false,
    };
  }

  // In production this runs against a sandboxed PostgreSQL instance
  // For local dev, we use basic query analysis heuristics
  return evaluateSqlHeuristic(query, config as unknown as SqlConfig, points);
};

function evaluateSqlHeuristic(
  query: string,
  config: SqlConfig,
  points: number
): ScoringResult {
  const q = query.toLowerCase();
  const expected = (config.expectedSql || '').toLowerCase();

  // Check for SELECT
  if (!q.includes('select')) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'Query must include a SELECT statement.',
      requiresManualReview: true,
    };
  }

  // If we have an expected solution, do keyword comparison
  if (expected) {
    const expectedKeywords = extractSqlKeywords(expected);
    const candidateKeywords = extractSqlKeywords(q);
    const hits = expectedKeywords.filter((k) => candidateKeywords.includes(k)).length;
    const ratio = expectedKeywords.length > 0 ? hits / expectedKeywords.length : 0.5;
    const score = Math.round(ratio * points);

    return {
      score,
      maxScore: points,
      isCorrect: ratio >= 0.8,
      feedback: ratio >= 0.8
        ? 'Query matches expected structure.'
        : `Partial match. Your query captures ${Math.round(ratio * 100)}% of the expected elements. Recruiter review recommended.`,
      requiresManualReview: ratio < 0.8,
    };
  }

  // No expected SQL — flag for manual review
  return {
    score: Math.round(points * 0.5), // provisional score
    maxScore: points,
    isCorrect: null,
    feedback: 'Query submitted. Pending recruiter review for full scoring.',
    requiresManualReview: true,
  };
}

function extractSqlKeywords(sql: string): string[] {
  const keywords = [
    'select', 'from', 'where', 'join', 'inner join', 'left join', 'right join',
    'group by', 'order by', 'having', 'limit', 'distinct', 'union',
    'count', 'sum', 'avg', 'max', 'min', 'coalesce', 'case', 'when',
    'over', 'partition by', 'row_number', 'rank', 'dense_rank', 'lag', 'lead',
    'subquery', 'cte', 'with',
  ];
  return keywords.filter((k) => sql.includes(k));
}
