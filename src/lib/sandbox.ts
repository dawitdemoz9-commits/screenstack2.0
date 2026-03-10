/**
 * Skillio — Code Execution Sandbox
 *
 * ARCHITECTURE:
 * Candidate code NEVER runs on the main Next.js application server.
 * All code execution is delegated to an isolated external service.
 *
 * Production options (in order of ease):
 *   1. Judge0 (open source, self-hostable)  — https://github.com/judge0/judge0
 *   2. Piston API (open source, REST)       — https://github.com/engineer-man/piston
 *   3. AWS Lambda with gVisor sandbox
 *   4. Docker containers per submission (advanced)
 *
 * In development / MVP mode (CODE_EXECUTION_MOCK=true):
 *   - Code is NOT executed
 *   - Heuristic scoring is applied based on code structure
 *   - requiresManualReview is set to true so recruiters can score manually
 *
 * Isolation guarantees provided by Judge0 / Piston:
 *   - Each submission runs in an isolated Linux container
 *   - CPU and memory limits are enforced
 *   - No network access from inside the container
 *   - Filesystem is read-only except for a tmp directory
 *   - Execution timeout (configurable, default 5 seconds)
 */

export interface ExecutionRequest {
  language:  string;
  code:      string;
  stdin?:    string;
  timeoutMs?: number;
}

export interface ExecutionResult {
  stdout:     string;
  stderr:     string;
  exitCode:   number;
  timeMs:     number;
  timedOut:   boolean;
  memoryKb:   number;
}

// Language ID mapping for Judge0
export const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,  // Node.js 12
  typescript: 74,  // TypeScript 3.7
  python:     71,  // Python 3.8
  python3:    71,
  java:       62,  // Java 13
  csharp:     51,  // C# Mono 6.6
  cpp:        54,  // C++ 14 (GCC 9.2)
  go:         60,  // Go 1.13
  ruby:       72,  // Ruby 2.7
  sql:        82,  // SQLite 3.27
  bash:       46,  // Bash 5.0
};

/**
 * Execute candidate code in the configured sandbox.
 *
 * In mock mode: returns a simulated response without running anything.
 * In production: sends to Judge0 (or configured provider) and polls for result.
 *
 * Called by: src/lib/evaluators/code.ts
 * NOT called from: any API route directly — always goes through the evaluator
 */
export async function executeCode(req: ExecutionRequest): Promise<ExecutionResult> {
  if (process.env.CODE_EXECUTION_MOCK !== 'false') {
    return mockExecution(req);
  }

  const provider = process.env.CODE_EXECUTION_PROVIDER || 'judge0';

  if (provider === 'judge0') {
    return runOnJudge0(req);
  }

  if (provider === 'piston') {
    return runOnPiston(req);
  }

  // Fallback — should not reach here in production
  console.error('[Sandbox] Unknown CODE_EXECUTION_PROVIDER:', provider);
  return mockExecution(req);
}

// ─── Mock (development) ───────────────────────────────────────────────────────

function mockExecution(req: ExecutionRequest): ExecutionResult {
  // Return a simulated response — code is NOT run
  return {
    stdout:   '[Mock] Code execution is disabled. Set CODE_EXECUTION_MOCK=false to enable.',
    stderr:   '',
    exitCode: 0,
    timeMs:   0,
    timedOut: false,
    memoryKb: 0,
  };
}

// ─── Judge0 ───────────────────────────────────────────────────────────────────
// Docs: https://judge0.com/  |  Self-host: https://github.com/judge0/judge0

async function runOnJudge0(req: ExecutionRequest): Promise<ExecutionResult> {
  const baseUrl    = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
  const apiKey     = process.env.JUDGE0_API_KEY || '';
  const languageId = JUDGE0_LANGUAGE_IDS[req.language] || 63;
  const timeoutSec = Math.ceil((req.timeoutMs || 5000) / 1000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
  }

  // Submit
  const submitRes = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language_id:       languageId,
      source_code:       req.code,
      stdin:             req.stdin || '',
      cpu_time_limit:    timeoutSec,
      memory_limit:      128 * 1024, // 128 MB in KB
    }),
  });

  if (!submitRes.ok) {
    throw new Error(`Judge0 submission failed: ${submitRes.status}`);
  }

  const result = await submitRes.json();

  return {
    stdout:   result.stdout   || '',
    stderr:   result.stderr   || result.compile_output || '',
    exitCode: result.exit_code ?? (result.status?.id === 3 ? 0 : 1),
    timeMs:   Math.round((result.time || 0) * 1000),
    timedOut: result.status?.id === 5, // TLE
    memoryKb: result.memory  || 0,
  };
}

// ─── Piston ───────────────────────────────────────────────────────────────────
// Docs: https://github.com/engineer-man/piston  |  API: https://emkc.org/api/v2/piston

async function runOnPiston(req: ExecutionRequest): Promise<ExecutionResult> {
  const baseUrl = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston';

  const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
    javascript: { language: 'javascript', version: '18.15.0' },
    python:     { language: 'python',     version: '3.10.0'  },
    python3:    { language: 'python',     version: '3.10.0'  },
    java:       { language: 'java',       version: '15.0.2'  },
    typescript: { language: 'typescript', version: '5.0.3'   },
    go:         { language: 'go',         version: '1.16.2'  },
  };

  const lang = PISTON_LANGUAGES[req.language] || { language: req.language, version: '*' };

  const res = await fetch(`${baseUrl}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang.language,
      version:  lang.version,
      files:    [{ name: `solution.${req.language}`, content: req.code }],
      stdin:    req.stdin || '',
      run_timeout: req.timeoutMs || 5000,
    }),
  });

  if (!res.ok) throw new Error(`Piston execution failed: ${res.status}`);

  const result = await res.json();
  const run = result.run || {};

  return {
    stdout:   run.stdout  || '',
    stderr:   run.stderr  || '',
    exitCode: run.code    ?? 0,
    timeMs:   0, // Piston doesn't return timing
    timedOut: run.signal === 'SIGKILL',
    memoryKb: 0,
  };
}
