import type { ScoringResult } from '@/types';
import type { EvaluatorFn } from './index';
import { executeCode } from '@/lib/sandbox';

// ─── Code Evaluator ──────────────────────────────────────────────────────────
// Candidate code NEVER executes on the main server.
// All execution is delegated to src/lib/sandbox.ts which routes to an
// isolated external service (Judge0, Piston, or mock for development).
// See src/lib/sandbox.ts for the full architecture documentation.

interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  description?: string;
}

interface CodeConfig {
  language: string;
  testCases: TestCase[];
  solutionCode?: string;
}

export const codeEvaluator: EvaluatorFn = async (
  config,
  answer,
  points
): Promise<ScoringResult> => {
  const { testCases = [] } = config as unknown as CodeConfig;
  const code = (answer.code as string) || '';

  if (!code.trim()) {
    return {
      score: 0,
      maxScore: points,
      isCorrect: false,
      feedback: 'No code submitted.',
      requiresManualReview: true,
    };
  }

  // In production, call Judge0 API here
  if (process.env.CODE_EXECUTION_MOCK !== 'false') {
    // MOCK: give partial credit based on code length and basic patterns
    // Real implementation: submit to Judge0 and compare stdout
    return mockCodeEvaluation(code, testCases, points);
  }

  // Production: delegate to sandbox service (Judge0 / Piston)
  return runInSandbox(code, config as unknown as CodeConfig, testCases, points);
};

function mockCodeEvaluation(
  code: string,
  testCases: TestCase[],
  points: number
): ScoringResult {
  // Heuristic scoring for demo purposes — recruiter should manually review
  const hasContent = code.length > 20;
  const hasFunction = /function|def |=>/i.test(code);
  const hasReturn = /return/i.test(code);

  const qualityScore = [hasContent, hasFunction, hasReturn].filter(Boolean).length;
  const mockScore = Math.round((qualityScore / 3) * points * 0.7); // max 70% auto-score

  return {
    score: mockScore,
    maxScore: points,
    isCorrect: null,
    feedback: `[MOCK EVALUATION — Code execution sandbox not connected]\n\nCode received (${code.length} chars). ${testCases.length} test cases defined. A recruiter should review this submission.\n\nAuto-score is an estimate only.`,
    requiresManualReview: true,
  };
}

async function runInSandbox(
  code: string,
  config: CodeConfig,
  testCases: TestCase[],
  points: number
): Promise<ScoringResult> {
  const visibleTests = testCases.filter((t) => !t.isHidden);
  let passed = 0;
  const results: string[] = [];

  for (const tc of visibleTests) {
    try {
      const result = await executeCode({
        language:  config.language,
        code,
        stdin:     tc.input,
        timeoutMs: 5000,
      });

      const actual   = result.stdout.trim();
      const expected = tc.expectedOutput.trim();

      if (!result.timedOut && result.exitCode === 0 && actual === expected) {
        passed++;
        results.push(`✓ ${tc.description || 'Test case'}`);
      } else if (result.timedOut) {
        results.push(`✗ ${tc.description || 'Test case'}: Time limit exceeded`);
      } else if (result.exitCode !== 0) {
        results.push(`✗ ${tc.description || 'Test case'}: Runtime error — ${result.stderr.slice(0, 120)}`);
      } else {
        results.push(`✗ ${tc.description || 'Test case'}: Expected "${expected}", got "${actual}"`);
      }
    } catch {
      results.push(`✗ ${tc.description || 'Test case'}: Execution service unavailable`);
    }
  }

  const total = visibleTests.length;
  const ratio = total > 0 ? passed / total : 0;
  const score = Math.round(ratio * points);

  return {
    score,
    maxScore: points,
    isCorrect: passed === total && total > 0,
    feedback: results.join('\n'),
    requiresManualReview: score < points,
  };
}
