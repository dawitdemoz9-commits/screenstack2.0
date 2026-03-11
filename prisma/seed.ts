/**
 * Skillio — Database Seed
 *
 * Creates:
 *  - 2 admin/recruiter users
 *  - 10 starter assessment templates (one per major role)
 *  - Each template has 2–3 sections and 8–12 questions covering the key skills
 *    for that role
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAssessment(
  createdById: string,
  data: {
    title: string;
    description: string;
    roleType: string;
    instructions: string;
    timeLimit: number;
    passingScore: number;
    templateSlug: string;
    sections: {
      title: string;
      description?: string;
      questions: {
        type: string;
        title: string;
        body: string;
        points: number;
        difficulty: 'easy' | 'medium' | 'hard';
        evaluator: string;
        skillTags: string[];
        platform?: string;
        config: Record<string, unknown>;
      }[];
    }[];
  }
) {
  const existing = await prisma.assessment.findUnique({ where: { templateSlug: data.templateSlug } });
  if (existing) {
    await prisma.assessment.update({ where: { id: existing.id }, data: { monitoringEnabled: true } });
    return;
  }
  const assessment = await prisma.assessment.create({
    data: {
      title:             data.title,
      description:       data.description,
      roleType:          data.roleType,
      instructions:      data.instructions,
      timeLimit:         data.timeLimit,
      passingScore:      data.passingScore,
      monitoringEnabled: true,
      isTemplate:        true,
      templateSlug:      data.templateSlug,
      createdById,
    },
  });

  for (let si = 0; si < data.sections.length; si++) {
    const sec = data.sections[si];
    const section = await prisma.assessmentSection.create({
      data: {
        title:        sec.title,
        description:  sec.description,
        orderIndex:   si,
        assessmentId: assessment.id,
      },
    });

    for (let qi = 0; qi < sec.questions.length; qi++) {
      const q = sec.questions[qi];
      await prisma.question.create({
        data: {
          sectionId:  section.id,
          type:       q.type as never,
          title:      q.title,
          body:       q.body,
          points:     q.points,
          difficulty: q.difficulty,
          evaluator:  q.evaluator,
          skillTags:  q.skillTags,
          platform:   q.platform,
          orderIndex: qi,
          config:     q.config as never,
        },
      });
    }
  }

  return assessment;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding Skillio database…');

  // ── Enable monitoring on all existing assessments ──────────────────────────
  await prisma.assessment.updateMany({ data: { monitoringEnabled: true } });

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12);
  const recruiterHash = await bcrypt.hash('recruiter123', 12);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@skillio.io' },
    update: {},
    create: {
      email:        'admin@skillio.io',
      name:         'Dawit Admin',
      passwordHash: adminHash,
      role:         'ADMIN',
    },
  });

  await prisma.user.upsert({
    where:  { email: 'recruiter@skillio.io' },
    update: {},
    create: {
      email:        'recruiter@skillio.io',
      name:         'Recruiter',
      passwordHash: recruiterHash,
      role:         'RECRUITER',
    },
  });
for (const u of [
  { email: 'matt.gorman1@talentmsh.com',   name: 'matt gorman',    password: 'MSH2026'   },
  { email: 'ballard.taleck@talentmsh.com', name: 'ballard taleck', password: 'MSH1_2026' },
  { email: 'kurt.vosburgh1@talentmsh.com', name: 'kurt vosburgh',  password: 'Msh2026!'  },
  { email: 'daryl.polydor@talentmsh.com',  name: 'daryl polydor',  password: 'MSh2026'   },
  { email: 'sami.adler@talentmsh.com',     name: 'sami adler',     password: 'msH2026'   },
  { email: 'oz.rashid@talentmsh.com',      name: 'oz rashid',      password: 'MSH2026^'  },
]) {
  await prisma.user.upsert({
    where:  { email: u.email },
    update: {},
    create: {
      email:        u.email,
      name:         u.name,
      passwordHash: await bcrypt.hash(u.password, 12),
      role:         'RECRUITER',
    },
  });
}
  const uid = admin.id;

  // ════════════════════════════════════════════════════════════════════════════
  // 1. REACT DEVELOPER
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'React Developer — Starter Assessment',
    description: 'Tests React fundamentals, hooks, component patterns, and performance optimisation.',
    roleType: 'react-developer',
    templateSlug: 'react-developer-starter',
    timeLimit: 75,
    passingScore: 70,
    instructions: 'Answer all questions to the best of your ability. Code questions can be written in JavaScript or TypeScript. Focus on correctness first, then performance.',
    sections: [
      {
        title: 'Fundamentals & Hooks',
        description: 'Core React concepts and modern hooks usage.',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'What does useEffect do in React?',
            body: 'Which of the following best describes the purpose of the `useEffect` hook?',
            points: 10, difficulty: 'easy',
            skillTags: ['react', 'hooks', 'lifecycle'],
            config: {
              options: [
                { label: 'It replaces the component with a new one on every render', value: 'A' },
                { label: 'It runs a side effect (e.g. API call, subscription) after render and optionally when dependencies change', value: 'B' },
                { label: 'It synchronously updates state before the browser paints', value: 'C' },
                { label: 'It memoises the return value of a function', value: 'D' },
              ],
              correct: 'B',
              explanation: 'useEffect runs after React commits changes to the DOM. It is used for side effects like data fetching, subscriptions, and DOM manipulation.',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Controlled vs Uncontrolled Components',
            body: 'What is the key difference between a controlled and an uncontrolled input component in React?',
            points: 10, difficulty: 'easy',
            skillTags: ['react', 'forms', 'state'],
            config: {
              options: [
                { label: 'Controlled components are class-based; uncontrolled are functional', value: 'A' },
                { label: 'A controlled component has its value managed by React state via value + onChange; an uncontrolled component stores its state in the DOM (accessed via refs)', value: 'B' },
                { label: 'Controlled components render faster than uncontrolled ones', value: 'C' },
                { label: 'Uncontrolled components cannot be submitted in a form', value: 'D' },
              ],
              correct: 'B',
              explanation: 'In a controlled component, React is the single source of truth. In uncontrolled, the DOM stores the form state and you read it with a ref.',
            },
          },
          {
            type: 'MULTI_SELECT', evaluator: 'multi_select',
            title: 'When does useEffect re-run?',
            body: 'Select ALL scenarios in which a useEffect hook will re-run:',
            points: 10, difficulty: 'medium',
            skillTags: ['react', 'hooks', 'useEffect'],
            config: {
              options: [
                { label: 'On every render (no dependency array)', value: 'A' },
                { label: 'Only once on mount (empty array [])', value: 'B' },
                { label: 'When a listed dependency changes', value: 'C' },
                { label: "Whenever the component's parent renders, regardless of dependencies", value: 'D' },
              ],
              correct: ['A', 'B', 'C'],
              partialCredit: true,
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'Custom Data-Fetching Hook',
            body: `Write a reusable custom React hook called \`useFetch\` that:
- Accepts a URL string
- Fetches data from that URL when the component mounts
- Returns an object: \`{ data, loading, error }\`
- Sets \`loading: true\` while fetching
- Sets \`error\` if the fetch fails
- Cleans up in-flight requests on unmount (use AbortController)`,
            points: 20, difficulty: 'medium',
            skillTags: ['react', 'hooks', 'fetch', 'custom-hooks'],
            config: {
              language: 'javascript',
              starterCode: `function useFetch(url) {
  // Your implementation here
}`,
              solutionCode: `function useFetch(url) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(r => r.json())
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') setError(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}`,
              testCases: [],
            },
          },
        ],
      },
      {
        title: 'Performance & Patterns',
        description: 'Advanced patterns and rendering optimisation.',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'React.memo vs useMemo',
            body: 'Which statement correctly describes the difference between `React.memo` and `useMemo`?',
            points: 10, difficulty: 'medium',
            skillTags: ['react', 'performance', 'memoisation'],
            config: {
              options: [
                { label: 'React.memo memoises a component (prevents re-render if props unchanged); useMemo memoises a computed value', value: 'A' },
                { label: 'useMemo memoises a component; React.memo memoises a value', value: 'B' },
                { label: 'Both do the same thing in different contexts', value: 'C' },
                { label: 'React.memo is deprecated in React 18', value: 'D' },
              ],
              correct: 'A',
              explanation: 'React.memo is a HOC that skips re-rendering a component if its props haven\'t changed. useMemo caches the result of a computation between renders.',
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Diagnosing a Re-Render Performance Problem',
            body: `A list component renders 500 rows. Every time the parent's state changes (e.g. a search box), ALL rows re-render even if the row data hasn't changed.

Describe at least THREE strategies you would use to fix this performance problem, explaining what each one does and when you would choose it.`,
            points: 15, difficulty: 'hard',
            skillTags: ['react', 'performance', 'rendering'],
            config: {
              rubric: [
                { criterion: 'Mentions React.memo or PureComponent to skip unchanged rows', maxPoints: 5, guidance: 'Award 5 if explained correctly' },
                { criterion: 'Mentions useCallback/useMemo to stabilise props passed to rows', maxPoints: 5, guidance: 'Award 5 if explained correctly' },
                { criterion: 'Mentions virtualisation (react-window, react-virtual) for large lists', maxPoints: 5, guidance: 'Award 5 if mentioned with rationale' },
              ],
            },
          },
          {
            type: 'DEBUGGING_CHALLENGE', evaluator: 'code',
            title: 'Fix the Stale Closure Bug',
            body: `The following counter has a bug — clicking "Add 5" never results in a count above 1.
Find and fix the bug.

\`\`\`jsx
function Counter() {
  const [count, setCount] = React.useState(0);

  function addFive() {
    for (let i = 0; i < 5; i++) {
      setCount(count + 1); // Bug is here
    }
  }

  return <button onClick={addFive}>Count: {count}</button>;
}
\`\`\``,
            points: 15, difficulty: 'medium',
            skillTags: ['react', 'state', 'closures', 'debugging'],
            config: {
              language: 'javascript',
              starterCode: `function Counter() {
  const [count, setCount] = React.useState(0);

  function addFive() {
    for (let i = 0; i < 5; i++) {
      setCount(count + 1); // Fix this line
    }
  }

  return <button onClick={addFive}>Count: {count}</button>;
}`,
              solutionCode: `// Fix: use the functional updater form to avoid stale closure
setCount(prev => prev + 1);`,
              testCases: [],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. BACKEND ENGINEER
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Backend Engineer — Starter Assessment',
    description: 'Tests REST API design, SQL, security patterns, and async programming.',
    roleType: 'backend-engineer',
    templateSlug: 'backend-engineer-starter',
    timeLimit: 90,
    passingScore: 70,
    instructions: 'Questions cover API design, SQL, and system design. For code questions, use any language you are comfortable with (Python, Node.js, Java, Go).',
    sections: [
      {
        title: 'API Design & REST',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Correct HTTP method for partial update',
            body: 'You need to update only the `email` field of a user resource. Which HTTP method is most appropriate?',
            points: 10, difficulty: 'easy',
            skillTags: ['rest', 'http', 'api-design'],
            config: {
              options: [
                { label: 'PUT — replaces the entire resource', value: 'A' },
                { label: 'PATCH — applies a partial modification', value: 'B' },
                { label: 'POST — submits data to be processed', value: 'C' },
                { label: 'UPDATE — HTTP standard for updates', value: 'D' },
              ],
              correct: 'B',
              explanation: 'PATCH applies a partial update. PUT replaces the entire resource and requires sending all fields.',
            },
          },
          {
            type: 'MULTI_SELECT', evaluator: 'multi_select',
            title: 'Correct HTTP status codes',
            body: 'Select ALL correct status code mappings:',
            points: 10, difficulty: 'easy',
            skillTags: ['rest', 'http', 'status-codes'],
            config: {
              options: [
                { label: '200 — successful GET response', value: 'A' },
                { label: '201 — resource created successfully', value: 'B' },
                { label: '401 — unauthorized (missing/invalid credentials)', value: 'C' },
                { label: '403 — forbidden (authenticated but no permission)', value: 'D' },
                { label: '404 — resource not found', value: 'E' },
              ],
              correct: ['A','B','C','D'],
              partialCredit: true,
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Rate Limiting Strategy',
            body: `Your API is being abused — a single client is making 10,000 requests per minute, degrading service for all other users.

Design a rate limiting solution. Include:
1. What rate limiting strategy you'd use (fixed window, sliding window, token bucket, etc.) and why
2. Where in the stack you'd implement it
3. What response you'd return to a rate-limited client
4. Any edge cases to consider`,
            points: 20, difficulty: 'hard',
            skillTags: ['api-design', 'security', 'rate-limiting', 'system-design'],
            config: {
              rubric: [
                { criterion: 'Chooses an appropriate algorithm and explains the tradeoffs', maxPoints: 8, guidance: 'Token bucket and sliding window are best; fixed window is acceptable' },
                { criterion: 'Mentions implementation layer (API gateway, middleware, Redis)', maxPoints: 6, guidance: 'Redis-based distributed rate limiting is ideal' },
                { criterion: 'Returns 429 with Retry-After header', maxPoints: 3, guidance: 'Must mention 429 Too Many Requests' },
                { criterion: 'Mentions edge cases (distributed systems, IP spoofing, authenticated vs anon)', maxPoints: 3, guidance: 'Any 2 edge cases = full marks' },
              ],
            },
          },
        ],
      },
      {
        title: 'SQL & Databases',
        questions: [
          {
            type: 'SQL_CHALLENGE', evaluator: 'sql',
            title: 'Top Customers by Revenue',
            body: `Given the tables below, write a SQL query that returns the **top 5 customers** by total revenue (sum of order amounts), including their name and total spend, ordered from highest to lowest.`,
            points: 15, difficulty: 'medium',
            skillTags: ['sql', 'aggregation', 'joins'],
            config: {
              schema: `CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  amount DECIMAL(10,2),
  created_at TIMESTAMP
);`,
              expectedSql: `SELECT c.name, SUM(o.amount) AS total_revenue
FROM customers c
JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
ORDER BY total_revenue DESC
LIMIT 5;`,
            },
          },
          {
            type: 'SQL_CHALLENGE', evaluator: 'sql',
            title: 'Running Total with Window Function',
            body: `Write a SQL query that shows each order for customer_id = 1, with a running total (cumulative sum) of their spending across all orders, ordered by date.`,
            points: 15, difficulty: 'hard',
            skillTags: ['sql', 'window-functions', 'analytics'],
            config: {
              schema: `CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  amount DECIMAL(10,2),
  created_at TIMESTAMP
);`,
              expectedSql: `SELECT id, amount, created_at,
  SUM(amount) OVER (
    ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM orders
WHERE customer_id = 1
ORDER BY created_at;`,
            },
          },
        ],
      },
      {
        title: 'Security & Async',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'JWT vs Session Tokens',
            body: 'Which statement correctly describes a key tradeoff between JWT and server-side session tokens?',
            points: 10, difficulty: 'medium',
            skillTags: ['security', 'authentication', 'jwt'],
            config: {
              options: [
                { label: 'JWTs can be revoked instantly; sessions cannot', value: 'A' },
                { label: 'Sessions are stateless; JWTs require a database lookup', value: 'B' },
                { label: 'JWTs are stateless (no server storage) but difficult to revoke before expiry without a blocklist', value: 'C' },
                { label: 'JWTs are always more secure than session tokens', value: 'D' },
              ],
              correct: 'C',
              explanation: 'JWTs are self-contained and stateless, which is their main advantage. The main disadvantage is that you cannot revoke a valid JWT without maintaining a blocklist (which reintroduces state).',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'Async Retry with Exponential Backoff',
            body: `Write a function \`retryWithBackoff(fn, maxRetries, baseDelayMs)\` that:
- Calls an async function \`fn\`
- If \`fn\` throws, retries up to \`maxRetries\` times
- Waits \`baseDelayMs * 2^attempt\` milliseconds between retries (exponential backoff)
- Throws the last error if all retries are exhausted`,
            points: 20, difficulty: 'hard',
            skillTags: ['async', 'javascript', 'resilience', 'patterns'],
            config: {
              language: 'javascript',
              starterCode: `async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 100) {
  // Your implementation
}`,
              solutionCode: `async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 100) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}`,
              testCases: [],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. DATA ANALYST
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Data Analyst — Starter Assessment',
    description: 'Tests SQL proficiency, statistical reasoning, data visualisation judgement, and analytical thinking.',
    roleType: 'data-analyst',
    templateSlug: 'data-analyst-starter',
    timeLimit: 60,
    passingScore: 65,
    instructions: 'This assessment covers SQL, statistics, and data interpretation. For SQL questions, write standard SQL compatible with PostgreSQL.',
    sections: [
      {
        title: 'SQL Analysis',
        questions: [
          {
            type: 'SQL_CHALLENGE', evaluator: 'sql',
            title: 'Monthly Active Users',
            body: `Using the \`events\` table, write a query to find the number of **distinct users who were active in each month** of 2024, ordered by month.`,
            points: 15, difficulty: 'medium',
            skillTags: ['sql', 'aggregation', 'date-functions'],
            config: {
              schema: `CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  event_type VARCHAR(50),
  created_at TIMESTAMP
);`,
              expectedSql: `SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(DISTINCT user_id) AS active_users
FROM events
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'
GROUP BY 1
ORDER BY 1;`,
            },
          },
          {
            type: 'SQL_CHALLENGE', evaluator: 'sql',
            title: 'Cohort Retention (Month 1)',
            body: `Write a query that calculates the **Month 1 retention rate** — the percentage of users who signed up in January 2024 who also had at least one event in February 2024.

Tables: \`users\` (id, created_at) and \`events\` (user_id, created_at).`,
            points: 20, difficulty: 'hard',
            skillTags: ['sql', 'cohort-analysis', 'retention', 'joins'],
            config: {
              schema: `CREATE TABLE users (id INTEGER PRIMARY KEY, created_at TIMESTAMP);
CREATE TABLE events (user_id INTEGER, created_at TIMESTAMP);`,
              expectedSql: `WITH jan_cohort AS (
  SELECT id FROM users
  WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01'
),
retained AS (
  SELECT DISTINCT e.user_id
  FROM events e
  JOIN jan_cohort j ON e.user_id = j.id
  WHERE e.created_at >= '2024-02-01' AND e.created_at < '2024-03-01'
)
SELECT
  COUNT(j.id) AS cohort_size,
  COUNT(r.user_id) AS retained,
  ROUND(COUNT(r.user_id)::numeric / COUNT(j.id) * 100, 2) AS retention_pct
FROM jan_cohort j
LEFT JOIN retained r ON j.id = r.user_id;`,
            },
          },
        ],
      },
      {
        title: 'Statistics & Interpretation',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Mean vs Median for skewed data',
            body: 'A company\'s salary data has most employees earning $50k–$70k but a few executives earning $2M+. Which measure of central tendency is more appropriate to report as the "typical" salary and why?',
            points: 10, difficulty: 'easy',
            skillTags: ['statistics', 'data-interpretation'],
            config: {
              options: [
                { label: 'Mean — it uses all data points and is always the most accurate', value: 'A' },
                { label: 'Median — it is resistant to outliers and better represents the typical salary in a skewed distribution', value: 'B' },
                { label: 'Mode — the most common value is always most useful', value: 'C' },
                { label: 'Standard deviation — it shows the spread of salaries', value: 'D' },
              ],
              correct: 'B',
              explanation: 'The median is resistant to extreme outliers. In skewed distributions, the mean is pulled toward the tail, making it misleading as a "typical" value.',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Choosing the right chart type',
            body: 'You want to show how a company\'s monthly revenue has changed over 24 months. What chart type is most appropriate?',
            points: 10, difficulty: 'easy',
            skillTags: ['data-visualisation', 'chart-selection'],
            config: {
              options: [
                { label: 'Pie chart', value: 'A' },
                { label: 'Line chart', value: 'B' },
                { label: 'Scatter plot', value: 'C' },
                { label: 'Histogram', value: 'D' },
              ],
              correct: 'B',
              explanation: 'Line charts are ideal for showing trends over time. Pie charts show part-to-whole. Scatter plots show correlation. Histograms show distributions.',
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Diagnosing a drop in a key metric',
            body: `You are told that the company's conversion rate dropped from 4.2% to 2.8% between last week and this week.

Walk through your diagnostic process step by step. What questions would you ask? What data would you pull? What are the most likely explanations? How would you determine root cause vs correlation?`,
            points: 20, difficulty: 'hard',
            skillTags: ['analytics', 'problem-solving', 'metrics'],
            config: {
              rubric: [
                { criterion: 'Segments the metric (by device, channel, geography, etc.) before assuming a global issue', maxPoints: 8, guidance: 'Award 8 if they specifically mention segmentation as a first step' },
                { criterion: 'Checks for data/tracking issues before diagnosing a real problem', maxPoints: 5, guidance: 'Should mention verifying the data pipeline' },
                { criterion: 'Lists multiple hypotheses and how to validate each', maxPoints: 7, guidance: 'At least 3 hypotheses with validation approach' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DATA ENGINEER
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Data Engineer — Starter Assessment',
    description: 'Tests ETL/ELT design, data modelling, pipeline tooling, and Python data skills.',
    roleType: 'data-engineer',
    templateSlug: 'data-engineer-starter',
    timeLimit: 90,
    passingScore: 70,
    instructions: 'This assessment covers data pipeline design, SQL for data warehousing, and Python. Write Python 3 for coding questions.',
    sections: [
      {
        title: 'Data Pipeline Design',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'ETL vs ELT',
            body: 'Which statement best describes when to prefer ELT over ETL in a modern data stack?',
            points: 10, difficulty: 'medium',
            skillTags: ['etl', 'elt', 'data-warehouse'],
            config: {
              options: [
                { label: 'ELT is always faster than ETL because it skips transformation', value: 'A' },
                { label: 'Prefer ELT when you have a powerful cloud data warehouse (Snowflake, BigQuery, Redshift) because transformation can leverage the warehouse\'s compute rather than requiring an external transformation server', value: 'B' },
                { label: 'ETL should always be used when data comes from APIs', value: 'C' },
                { label: 'ELT cannot be used with structured data', value: 'D' },
              ],
              correct: 'B',
              explanation: 'ELT loads raw data first, then transforms inside the warehouse. This is ideal for cloud warehouses like Snowflake/BigQuery that offer cheap, scalable SQL compute (tools like dbt support this pattern).',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Star Schema vs Snowflake Schema',
            body: 'A BI team complains that their queries are slow. The data warehouse uses a snowflake schema. What is a likely reason, and what would you suggest?',
            points: 10, difficulty: 'medium',
            skillTags: ['data-modelling', 'star-schema', 'data-warehouse'],
            config: {
              options: [
                { label: 'Snowflake schemas have no indexes; add indexes to fix it', value: 'A' },
                { label: 'Snowflake schemas normalise dimension tables into multiple tables, increasing the number of JOINs required. Denormalising into a star schema reduces JOIN depth and speeds up analytical queries.', value: 'B' },
                { label: 'Snowflake schemas only work with Snowflake the product', value: 'C' },
                { label: 'Star schemas have more tables than snowflake schemas', value: 'D' },
              ],
              correct: 'B',
              explanation: 'Snowflake schemas are more normalised (less storage), but require more JOINs. Star schemas denormalise dimensions, which is faster for analytical query patterns.',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'Python ETL: Flatten Nested JSON',
            body: `Write a Python function \`flatten_records(records)\` that takes a list of nested JSON objects and returns a flat list of dictionaries suitable for loading into a SQL table.

Input:
\`\`\`python
[
  { "id": 1, "user": { "name": "Alice", "email": "a@example.com" }, "score": 95 },
  { "id": 2, "user": { "name": "Bob",   "email": "b@example.com" }, "score": 82 },
]
\`\`\`

Expected output:
\`\`\`python
[
  { "id": 1, "user_name": "Alice", "user_email": "a@example.com", "score": 95 },
  { "id": 2, "user_name": "Bob",   "user_email": "b@example.com", "score": 82 },
]
\`\`\``,
            points: 20, difficulty: 'medium',
            skillTags: ['python', 'etl', 'json', 'data-transformation'],
            config: {
              language: 'python',
              starterCode: `def flatten_records(records):
    # Your implementation
    pass`,
              solutionCode: `def flatten_records(records):
    result = []
    for record in records:
        flat = {}
        for key, value in record.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    flat[f"{key}_{sub_key}"] = sub_value
            else:
                flat[key] = value
        result.append(flat)
    return result`,
              testCases: [
                {
                  input: '[{"id":1,"user":{"name":"Alice","email":"a@x.com"},"score":95}]',
                  expectedOutput: '[{"id":1,"user_name":"Alice","user_email":"a@x.com","score":95}]',
                  description: 'Basic flattening',
                },
              ],
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Designing a Data Quality Framework',
            body: `You are responsible for a daily ETL pipeline that loads 10 million rows of sales data into a data warehouse. Business users have complained about incorrect totals in their dashboards.

Design a data quality framework for this pipeline. Address:
1. What checks would you run and at what stage (source, during load, after load)?
2. How would you handle failures — alert and stop, or alert and continue?
3. How would you surface quality issues to downstream consumers?
4. What tooling would you consider?`,
            points: 20, difficulty: 'hard',
            skillTags: ['data-quality', 'pipeline-design', 'data-engineering'],
            config: {
              rubric: [
                { criterion: 'Covers multiple check types: nulls, duplicates, referential integrity, statistical checks', maxPoints: 8, guidance: 'Must mention at least 3 types' },
                { criterion: 'Has a clear failure handling strategy with appropriate severity levels', maxPoints: 6, guidance: 'Distinguish critical vs warning failures' },
                { criterion: 'Mentions specific tooling (Great Expectations, dbt tests, Soda, etc.)', maxPoints: 6, guidance: 'Any recognised tooling is valid' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. SALESFORCE DEVELOPER
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Salesforce Developer — Starter Assessment',
    description: 'Tests Apex, SOQL, trigger patterns, LWC lifecycle, and governor limits.',
    roleType: 'salesforce-developer',
    templateSlug: 'salesforce-developer-starter',
    timeLimit: 75,
    passingScore: 70,
    instructions: 'Answer questions about Apex development, SOQL, and Lightning Web Components. Code answers should follow Salesforce best practices.',
    sections: [
      {
        title: 'Apex & SOQL',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Apex Governor Limits — SOQL Queries',
            body: 'What is the per-transaction SOQL query governor limit in Salesforce Apex?',
            points: 10, difficulty: 'easy', platform: 'salesforce',
            skillTags: ['salesforce', 'apex', 'governor-limits'],
            config: {
              options: [
                { label: '50 SOQL queries', value: 'A' },
                { label: '100 SOQL queries', value: 'B' },
                { label: '200 SOQL queries', value: 'C' },
                { label: '500 SOQL queries', value: 'D' },
              ],
              correct: 'B',
              explanation: 'The synchronous SOQL query limit is 100 per transaction. Asynchronous (batch, future, queueable) is 200.',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Trigger Best Practice',
            body: 'What is considered the best practice for Salesforce Apex trigger architecture?',
            points: 10, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'apex', 'triggers', 'best-practices'],
            config: {
              options: [
                { label: 'Write all logic directly inside the trigger body for readability', value: 'A' },
                { label: 'Have one trigger per object that delegates to a handler class — keeping trigger logic thin', value: 'B' },
                { label: 'Use multiple triggers per object, one for each operation (before insert, after update, etc.)', value: 'C' },
                { label: 'Avoid using triggers; use Process Builder instead', value: 'D' },
              ],
              correct: 'B',
              explanation: 'One trigger per object with a handler class pattern keeps code testable, maintainable, and avoids ordering conflicts between multiple triggers on the same object.',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'Bulkified Account Trigger',
            body: `Write a **before insert** Apex trigger on the Account object that:
- Ensures the \`Name\` field is always stored in Title Case (first letter of each word capitalised)
- Is fully bulkified (handles collections, not single records)
- Does NOT contain SOQL inside the loop

Example: "acme corporation" → "Acme Corporation"`,
            points: 20, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'apex', 'triggers', 'bulkification'],
            config: {
              language: 'java', // Apex looks similar to Java
              starterCode: `trigger AccountTrigger on Account (before insert) {
    // Your implementation here
}`,
              solutionCode: `trigger AccountTrigger on Account (before insert) {
    AccountTriggerHandler.beforeInsert(Trigger.new);
}

public class AccountTriggerHandler {
    public static void beforeInsert(List<Account> newAccounts) {
        for (Account acc : newAccounts) {
            if (acc.Name != null) {
                acc.Name = toTitleCase(acc.Name);
            }
        }
    }

    private static String toTitleCase(String input) {
        List<String> words = input.toLowerCase().split(' ');
        List<String> result = new List<String>();
        for (String word : words) {
            if (word.length() > 0) {
                result.add(word.substring(0, 1).toUpperCase() + word.substring(1));
            }
        }
        return String.join(result, ' ');
    }
}`,
              testCases: [],
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Making a Callout from a Trigger',
            body: `A developer has written a trigger that makes an HTTP callout to an external REST API every time an Opportunity is closed-won. The code is in production and working in sandbox but failing in production with a "callout not allowed" error.

Explain:
1. Why this error occurs
2. The correct approach to making callouts from triggers
3. Any Governor Limit considerations`,
            points: 15, difficulty: 'hard', platform: 'salesforce',
            skillTags: ['salesforce', 'apex', 'callouts', 'async', 'best-practices'],
            config: {
              rubric: [
                { criterion: 'Correctly explains that synchronous callouts from triggers are not allowed; DML + callout cannot mix in same transaction', maxPoints: 5, guidance: 'Must mention the DML restriction' },
                { criterion: 'Recommends @future(callout=true) or Queueable Apex with callout permission', maxPoints: 5, guidance: 'Either solution is valid; Platform Events is also valid' },
                { criterion: 'Mentions callout limits (100 per transaction) and timeout limits', maxPoints: 5, guidance: 'Award if any governor limit consideration is mentioned' },
              ],
            },
          },
        ],
      },
      {
        title: 'Lightning Web Components',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'LWC Component Lifecycle',
            body: 'In which LWC lifecycle hook is it safe to query child elements using `this.template.querySelector`?',
            points: 10, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'lwc', 'lifecycle'],
            config: {
              options: [
                { label: 'constructor()', value: 'A' },
                { label: 'connectedCallback()', value: 'B' },
                { label: 'renderedCallback()', value: 'C' },
                { label: 'disconnectedCallback()', value: 'D' },
              ],
              correct: 'C',
              explanation: 'renderedCallback() fires after the component renders (including child components). It is the first safe place to query child DOM elements. constructor() runs before the DOM exists.',
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. SALESFORCE ADMIN
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Salesforce Admin — Starter Assessment',
    description: 'Tests declarative automation, security model, reporting, and platform governance.',
    roleType: 'salesforce-admin',
    templateSlug: 'salesforce-admin-starter',
    timeLimit: 60,
    passingScore: 70,
    instructions: 'This assessment covers Salesforce configuration and administration. No code is required — answers should reflect declarative platform knowledge.',
    sections: [
      {
        title: 'Automation & Configuration',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Automation Tool Selection',
            body: 'A business requirement says: "When a Lead is converted, automatically create a follow-up Task for the owner due in 3 days." Which automation tool should you use?',
            points: 10, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'flow', 'automation'],
            config: {
              options: [
                { label: 'Workflow Rule', value: 'A' },
                { label: 'Process Builder', value: 'B' },
                { label: 'Record-Triggered Flow', value: 'C' },
                { label: 'Apex Trigger', value: 'D' },
              ],
              correct: 'C',
              explanation: 'Record-Triggered Flows are Salesforce\'s recommended automation tool. Workflow Rules cannot create child records (only tasks/emails/field updates). Process Builder is being retired. Apex is not needed for this declarative requirement.',
            },
          },
          {
            type: 'SHORT_ANSWER', evaluator: 'manual',
            title: 'Explain Profiles vs Permission Sets',
            body: `Explain the difference between Profiles and Permission Sets in Salesforce. When would you use each, and what is the recommended approach for managing user permissions in a modern Salesforce org?`,
            points: 15, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'security', 'permissions', 'admin'],
            config: {
              rubric: [
                { criterion: 'Profile is baseline permissions (one per user, required); Permission Sets grant additional permissions on top', maxPoints: 5, guidance: 'Must explain the baseline vs additive nature' },
                { criterion: 'Recommends Permission Set Groups as the modern approach for managing permissions', maxPoints: 5, guidance: 'Bonus for mentioning Permission Set Groups' },
                { criterion: 'Notes that Salesforce is moving toward a "Minimum Access Profile" + permission sets model', maxPoints: 5, guidance: 'Award if they mention this trend' },
              ],
            },
          },
        ],
      },
      {
        title: 'Security Model',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Org-Wide Default vs Sharing Rules',
            body: 'Your OWD (Org-Wide Default) for Opportunities is set to "Private". A team manager needs to see all opportunities owned by their direct reports. What is the most appropriate solution?',
            points: 10, difficulty: 'medium', platform: 'salesforce',
            skillTags: ['salesforce', 'security', 'sharing', 'OWD'],
            config: {
              options: [
                { label: 'Change the OWD to Public Read/Write', value: 'A' },
                { label: 'Create a Criteria-Based Sharing Rule that shares records with the manager\'s role', value: 'B' },
                { label: 'Give the manager the "View All Data" system permission', value: 'C' },
                { label: 'Use a Role Hierarchy where the manager\'s role is above the reports\' role', value: 'D' },
              ],
              correct: 'D',
              explanation: 'Role Hierarchy automatically grants read access to records owned by users in subordinate roles. This is the most appropriate, least-privilege approach.',
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Troubleshooting Record Access',
            body: `A user calls you to say they cannot see a Contact record that a colleague shared with them via the "Share" button. They can see other Contacts normally.

Walk through your troubleshooting steps. What would you check first, second, and third?`,
            points: 15, difficulty: 'hard', platform: 'salesforce',
            skillTags: ['salesforce', 'troubleshooting', 'sharing', 'admin'],
            config: {
              rubric: [
                { criterion: 'Checks whether the manual share actually exists (record detail page → Sharing button)', maxPoints: 5, guidance: 'First obvious check' },
                { criterion: 'Checks contact\'s Account access (Contact access is tied to Account access via OWD)', maxPoints: 5, guidance: 'Key Salesforce-specific knowledge' },
                { criterion: 'Uses "Login as user" or "View Setup Audit Trail" or OWD to diagnose further', maxPoints: 5, guidance: 'Shows depth of admin knowledge' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. SERVICENOW DEVELOPER
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'ServiceNow Developer — Starter Assessment',
    description: 'Tests Business Rules, Client Scripts, Script Includes, REST APIs, and ServiceNow scripting fundamentals.',
    roleType: 'servicenow-developer',
    templateSlug: 'servicenow-developer-starter',
    timeLimit: 75,
    passingScore: 70,
    instructions: 'Answer questions about ServiceNow platform development. Code should be written in JavaScript (Rhino engine compatible).',
    sections: [
      {
        title: 'Server-Side Scripting',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Business Rule Type Selection',
            body: 'You need to prevent a record from being inserted if a specific condition is met, and show an error message to the user. Which Business Rule type should you use?',
            points: 10, difficulty: 'medium', platform: 'servicenow',
            skillTags: ['servicenow', 'business-rules', 'scripting'],
            config: {
              options: [
                { label: 'After Business Rule', value: 'A' },
                { label: 'Before Business Rule with current.setAbortAction(true)', value: 'B' },
                { label: 'Display Business Rule', value: 'C' },
                { label: 'Async Business Rule', value: 'D' },
              ],
              correct: 'B',
              explanation: 'Before Business Rules run before the record is written to the database. Using current.setAbortAction(true) prevents the insert/update. Display BRs run during form load. After BRs run post-commit.',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'Script Include: Priority Escalator',
            body: `Write a ServiceNow Script Include called \`IncidentUtils\` with a method \`escalatePriority(incidentGr)\` that:
- Accepts a GlideRecord of an incident
- If the incident's priority is 3 (High), changes it to 1 (Critical)
- If the incident's category is "network", adds a work note: "Network incident escalated to Critical."
- Updates the record

Make the Script Include client-callable: false.`,
            points: 20, difficulty: 'medium', platform: 'servicenow',
            skillTags: ['servicenow', 'script-include', 'gliderecord'],
            config: {
              language: 'javascript',
              starterCode: `var IncidentUtils = Class.create();
IncidentUtils.prototype = {
    initialize: function() {},

    escalatePriority: function(incidentGr) {
        // Your implementation
    },

    type: 'IncidentUtils'
};`,
              solutionCode: `var IncidentUtils = Class.create();
IncidentUtils.prototype = {
    initialize: function() {},

    escalatePriority: function(incidentGr) {
        if (incidentGr.priority == 3) {
            incidentGr.priority = 1;
            if (incidentGr.category == 'network') {
                incidentGr.work_notes = 'Network incident escalated to Critical.';
            }
            incidentGr.update();
        }
    },

    type: 'IncidentUtils'
};`,
              testCases: [],
            },
          },
        ],
      },
      {
        title: 'Client-Side & Integration',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'Client Script Type',
            body: 'Which Client Script type runs every time a specific field value changes on a form?',
            points: 10, difficulty: 'easy', platform: 'servicenow',
            skillTags: ['servicenow', 'client-scripts'],
            config: {
              options: [
                { label: 'onLoad', value: 'A' },
                { label: 'onChange', value: 'B' },
                { label: 'onSubmit', value: 'C' },
                { label: 'onCellEdit', value: 'D' },
              ],
              correct: 'B',
              explanation: 'onChange fires when a specific field\'s value changes. onLoad fires when the form loads. onSubmit fires when the form is submitted. onCellEdit fires in list editing.',
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Designing a REST API Integration',
            body: `A third-party HR system needs to create ServiceNow Incidents automatically when an employee is offboarded. The HR system can make outbound REST calls.

Design the integration approach:
1. What ServiceNow feature would you use to receive the inbound call?
2. What authentication method would you recommend?
3. How would you handle errors and retries?
4. What data validation would you perform?`,
            points: 20, difficulty: 'hard', platform: 'servicenow',
            skillTags: ['servicenow', 'rest-api', 'integration'],
            config: {
              rubric: [
                { criterion: 'Recommends Scripted REST API or Table API with appropriate endpoint design', maxPoints: 6, guidance: 'Scripted REST API is preferred for control; Table API is acceptable' },
                { criterion: 'Recommends Basic Auth, OAuth, or mutual TLS; explains why', maxPoints: 6, guidance: 'OAuth 2.0 is best practice' },
                { criterion: 'Describes error handling strategy (400/500 responses, retry logic on HR side)', maxPoints: 4, guidance: 'Must address what the caller should do on failure' },
                { criterion: 'Mentions input validation (required fields, field format, duplicate detection)', maxPoints: 4, guidance: 'Any 2 validation concerns = full marks' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. NETSUITE DEVELOPER / ADMIN
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'NetSuite Developer/Admin — Starter Assessment',
    description: 'Tests SuiteScript 2.x, SuiteFlow, saved searches, and NetSuite customisation concepts.',
    roleType: 'netsuite-developer',
    templateSlug: 'netsuite-developer-starter',
    timeLimit: 75,
    passingScore: 65,
    instructions: 'Answer questions about NetSuite development and administration. SuiteScript answers should use SuiteScript 2.x (require/define syntax).',
    sections: [
      {
        title: 'SuiteScript & Scripting',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'SuiteScript Script Type Selection',
            body: 'You need to send an email notification every time a Sales Order is saved. Which SuiteScript script type is most appropriate?',
            points: 10, difficulty: 'medium', platform: 'netsuite',
            skillTags: ['netsuite', 'suitescript', 'script-types'],
            config: {
              options: [
                { label: 'Scheduled Script', value: 'A' },
                { label: 'User Event Script (afterSubmit)', value: 'B' },
                { label: 'Suitelet', value: 'C' },
                { label: 'Map/Reduce Script', value: 'D' },
              ],
              correct: 'B',
              explanation: 'User Event Scripts fire in response to record saves (beforeLoad, beforeSubmit, afterSubmit). afterSubmit is appropriate for post-save actions like sending emails. Scheduled scripts run on a timer.',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'SuiteScript 2.x Saved Search',
            body: `Write a SuiteScript 2.x function that:
- Loads a saved search on the Transaction record with id 'customsearch_open_pos'
- Runs the search
- Returns an array of objects with: { internalId, tranDate, amount } for each result`,
            points: 20, difficulty: 'medium', platform: 'netsuite',
            skillTags: ['netsuite', 'suitescript', 'saved-search', 'search-api'],
            config: {
              language: 'javascript',
              starterCode: `define(['N/search'], function(search) {
    function getOpenPOs() {
        // Your implementation
    }
    return { getOpenPOs: getOpenPOs };
});`,
              solutionCode: `define(['N/search'], function(search) {
    function getOpenPOs() {
        var results = [];
        var mySearch = search.load({ id: 'customsearch_open_pos' });
        var resultSet = mySearch.run();
        resultSet.each(function(result) {
            results.push({
                internalId: result.id,
                tranDate:   result.getValue({ name: 'trandate' }),
                amount:     result.getValue({ name: 'amount' }),
            });
            return true; // continue iteration
        });
        return results;
    }
    return { getOpenPOs: getOpenPOs };
});`,
              testCases: [],
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'SuiteScript Governance Units',
            body: 'What happens when a SuiteScript script exceeds its governance unit limit?',
            points: 10, difficulty: 'medium', platform: 'netsuite',
            skillTags: ['netsuite', 'suitescript', 'governance'],
            config: {
              options: [
                { label: 'The script pauses and resumes on the next server heartbeat', value: 'A' },
                { label: 'The script throws an SSS_USAGE_LIMIT_EXCEEDED error and terminates', value: 'B' },
                { label: 'NetSuite automatically upgrades you to a higher governance tier', value: 'C' },
                { label: 'The script is placed in a queue and completed asynchronously', value: 'D' },
              ],
              correct: 'B',
              explanation: 'Exceeding governance limits throws SSS_USAGE_LIMIT_EXCEEDED and terminates the script. For long-running operations, use Map/Reduce scripts which handle reschedule/resume automatically.',
            },
          },
        ],
      },
      {
        title: 'Admin & Configuration',
        questions: [
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Custom Record Type Design',
            body: `A business team wants to track "Project Deliverables" in NetSuite. Each deliverable belongs to a Project (custom record), has a due date, status, assigned employee, and estimated hours.

Design the custom record type:
1. What fields would you create and what field types would you use?
2. How would you relate deliverables to projects?
3. Would you use saved searches or reports to surface this data? How?
4. What security considerations should you plan for?`,
            points: 20, difficulty: 'hard', platform: 'netsuite',
            skillTags: ['netsuite', 'custom-records', 'admin', 'design'],
            config: {
              rubric: [
                { criterion: 'Defines appropriate field types (List/Record for status, Date for due date, Employee field for assignee, Currency/Integer for hours)', maxPoints: 6, guidance: 'Must correctly identify field types' },
                { criterion: 'Uses a List/Record field to link deliverable → project', maxPoints: 5, guidance: 'Must use list/record relationship' },
                { criterion: 'Mentions saved searches for list views, and portlets or reports for summary data', maxPoints: 5, guidance: 'Shows BI awareness' },
                { criterion: 'Addresses role-based permissions on the custom record type', maxPoints: 4, guidance: 'Permission levels on records' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. SAP CONSULTANT
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'SAP Consultant — Starter Assessment',
    description: 'Tests SAP functional knowledge, ABAP fundamentals, transport management, and integration patterns.',
    roleType: 'sap-consultant',
    templateSlug: 'sap-consultant-starter',
    timeLimit: 75,
    passingScore: 65,
    instructions: 'This assessment covers SAP concepts, ABAP programming, and functional module knowledge. Indicate the SAP module where relevant.',
    sections: [
      {
        title: 'SAP Fundamentals',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'SAP Transport Management',
            body: 'In SAP, what is the correct order of system landscape for transporting a development from DEV to PROD?',
            points: 10, difficulty: 'easy', platform: 'sap',
            skillTags: ['sap', 'transport', 'system-landscape'],
            config: {
              options: [
                { label: 'PROD → QAS → DEV', value: 'A' },
                { label: 'DEV → PROD → QAS', value: 'B' },
                { label: 'DEV → QAS → PROD', value: 'C' },
                { label: 'QAS → DEV → PROD', value: 'D' },
              ],
              correct: 'C',
              explanation: 'The standard SAP 3-system landscape is DEV (development) → QAS (quality assurance/testing) → PROD (production). Changes are always promoted from lower to higher environments.',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'BAPI vs BAdI',
            body: 'What is the key difference between a BAPI and a BAdI in SAP?',
            points: 10, difficulty: 'medium', platform: 'sap',
            skillTags: ['sap', 'abap', 'bapi', 'badi', 'enhancement'],
            config: {
              options: [
                { label: 'BAPI is a standard SAP function module (stable API for external calls); BAdI is a Business Add-In (enhancement point where you add custom logic without modifying standard code)', value: 'A' },
                { label: 'BAPI is only for HR; BAdI is only for FI/CO', value: 'B' },
                { label: 'They are the same thing — BAdI is the newer name for BAPI', value: 'C' },
                { label: 'BAPIs are custom-built; BAdIs are SAP standard', value: 'D' },
              ],
              correct: 'A',
              explanation: 'BAPIs are stable, standardised function modules that expose SAP business objects as APIs. BAdIs are enhancement points (hooks) in SAP standard code where custom implementations can be injected.',
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'SAP FI/CO Integration Scenario',
            body: `A client wants to automate the creation of SAP Journal Entries when a specific event occurs in their CRM system (external to SAP).

Design this integration:
1. What SAP technology would you use to receive the inbound data?
2. What SAP object would you use to post the journal entry?
3. How would you handle error cases (invalid account codes, posting period closed)?
4. What logging and monitoring would you implement?`,
            points: 20, difficulty: 'hard', platform: 'sap',
            skillTags: ['sap', 'fi', 'integration', 'idoc', 'bapi'],
            config: {
              rubric: [
                { criterion: 'Recommends iDoc, BAPI_ACC_DOCUMENT_POST, or SAP PI/PO for inbound integration', maxPoints: 6, guidance: 'Any of these is valid; extra credit for SAP Integration Suite/BTP' },
                { criterion: 'Mentions BAPI_ACC_DOCUMENT_POST or FB01 transaction concept', maxPoints: 5, guidance: 'Shows FI module knowledge' },
                { criterion: 'Describes error handling: validation before post, return messages from BAPI, exception handling', maxPoints: 5, guidance: 'BAPI return table for errors is key' },
                { criterion: 'Mentions application log (SLG1), idoc monitoring, or custom Z-table for audit', maxPoints: 4, guidance: 'Any monitoring approach' },
              ],
            },
          },
        ],
      },
      {
        title: 'ABAP Programming',
        questions: [
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'ABAP: SELECT with JOIN',
            body: `Write an ABAP SELECT statement that:
- Joins the VBAK (Sales Order Header) and VBAP (Sales Order Item) tables
- Retrieves: sales order number (VBELN), creation date (ERDAT), material number (MATNR), and quantity (KWMENG)
- Filters for orders created in the last 30 days
- Limits to 100 results`,
            points: 15, difficulty: 'medium', platform: 'sap',
            skillTags: ['sap', 'abap', 'sql', 'select'],
            config: {
              language: 'javascript', // No ABAP syntax highlighter; use JS as proxy
              starterCode: `" Write your ABAP SELECT statement here
DATA: lt_result TYPE TABLE OF ...

SELECT ...`,
              solutionCode: `DATA: lt_result TYPE TABLE OF ZRESULT.

SELECT a~vbeln, a~erdat, b~matnr, b~kwmeng
  INTO TABLE lt_result
  FROM vbak AS a
  INNER JOIN vbap AS b ON a~vbeln = b~vbeln
  WHERE a~erdat >= ( sy-datum - 30 )
  UP TO 100 ROWS.`,
              testCases: [],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. WORKDAY INTEGRATION SPECIALIST
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(uid, {
    title: 'Workday Integration Specialist — Starter Assessment',
    description: 'Tests Workday Studio, EIB, RaaS, XSLT transformations, and Workday API knowledge.',
    roleType: 'workday-integration',
    templateSlug: 'workday-integration-starter',
    timeLimit: 75,
    passingScore: 65,
    instructions: 'This assessment covers Workday integration technologies including Studio, EIB, RaaS, and the Workday API. Answer based on Workday\'s integration platform.',
    sections: [
      {
        title: 'Integration Architecture',
        questions: [
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'EIB vs Workday Studio',
            body: 'When would you choose Workday Studio over an Enterprise Interface Builder (EIB) integration?',
            points: 10, difficulty: 'medium', platform: 'workday',
            skillTags: ['workday', 'eiib', 'studio', 'integration'],
            config: {
              options: [
                { label: 'Always — Studio is more powerful than EIB in every case', value: 'A' },
                { label: 'When the integration requires complex data transformation, conditional logic, multiple web service calls, or bidirectional data flow', value: 'B' },
                { label: 'EIB should always be used for inbound integrations; Studio for outbound', value: 'C' },
                { label: 'Studio is only used for real-time integrations; EIB for batch', value: 'D' },
              ],
              correct: 'B',
              explanation: 'EIB is ideal for simple flat-file imports/exports. Studio supports complex orchestration, XSLT, multiple service calls, branching logic, and error handling — making it the right choice for complex integrations.',
            },
          },
          {
            type: 'MULTIPLE_CHOICE', evaluator: 'multiple_choice',
            title: 'RaaS Report Type',
            body: 'What does RaaS stand for in Workday, and what is it used for?',
            points: 10, difficulty: 'easy', platform: 'workday',
            skillTags: ['workday', 'raas', 'reporting'],
            config: {
              options: [
                { label: 'Reports as a Service — exposes Workday Custom Reports as REST/SOAP web services that external systems can call to retrieve data', value: 'A' },
                { label: 'Rapid Analytics as a Service — Workday\'s built-in BI tool', value: 'B' },
                { label: 'Record and Sync Service — for real-time data sync', value: 'C' },
                { label: 'Report Archiving and Storage — long-term report retention', value: 'D' },
              ],
              correct: 'A',
              explanation: 'RaaS (Reports as a Service) allows you to expose Workday custom reports as web service endpoints. External systems can call these endpoints to pull data from Workday without a full API integration.',
            },
          },
          {
            type: 'CODING_CHALLENGE', evaluator: 'code',
            title: 'XSLT Transformation',
            body: `Write an XSLT transformation that converts this Workday worker XML to a simplified flat format suitable for an HR downstream system.

**Input XML:**
\`\`\`xml
<workers>
  <worker>
    <Employee_ID>W001</Employee_ID>
    <Personal_Data>
      <Name>
        <First_Name>Alice</First_Name>
        <Last_Name>Smith</Last_Name>
      </Name>
      <Email>alice.smith@company.com</Email>
    </Personal_Data>
    <Position_Data>
      <Title>Senior Engineer</Title>
      <Department>Technology</Department>
    </Position_Data>
  </worker>
</workers>
\`\`\`

**Expected Output:**
\`\`\`xml
<employees>
  <employee id="W001">
    <full_name>Alice Smith</full_name>
    <email>alice.smith@company.com</email>
    <title>Senior Engineer</title>
    <department>Technology</department>
  </employee>
</employees>
\`\`\``,
            points: 20, difficulty: 'hard', platform: 'workday',
            skillTags: ['workday', 'xslt', 'transformation', 'xml'],
            config: {
              language: 'xml',
              starterCode: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>

  <!-- Your transformation here -->

</xsl:stylesheet>`,
              solutionCode: `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="xml" indent="yes"/>

  <xsl:template match="/">
    <employees>
      <xsl:apply-templates select="workers/worker"/>
    </employees>
  </xsl:template>

  <xsl:template match="worker">
    <employee>
      <xsl:attribute name="id">
        <xsl:value-of select="Employee_ID"/>
      </xsl:attribute>
      <full_name>
        <xsl:value-of select="concat(Personal_Data/Name/First_Name, ' ', Personal_Data/Name/Last_Name)"/>
      </full_name>
      <email><xsl:value-of select="Personal_Data/Email"/></email>
      <title><xsl:value-of select="Position_Data/Title"/></title>
      <department><xsl:value-of select="Position_Data/Department"/></department>
    </employee>
  </xsl:template>
</xsl:stylesheet>`,
              testCases: [],
            },
          },
          {
            type: 'SCENARIO', evaluator: 'manual',
            title: 'Integration Error Handling Strategy',
            body: `A nightly Workday Studio integration exports new hires to a payroll system. Last week it failed silently — payroll was not notified, and 12 new employees were not set up in time.

Design a robust error handling and alerting strategy for this integration:
1. What types of errors could occur in a Studio integration?
2. How should each type be handled?
3. How would you ensure the payroll team is notified of failures?
4. What retry strategy would you implement?`,
            points: 20, difficulty: 'hard', platform: 'workday',
            skillTags: ['workday', 'studio', 'error-handling', 'integration'],
            config: {
              rubric: [
                { criterion: 'Identifies error categories: connection errors, data validation, business logic, transformation errors', maxPoints: 5, guidance: 'At least 3 categories' },
                { criterion: 'Describes try/catch patterns in Studio and using fault documents', maxPoints: 5, guidance: 'Studio-specific knowledge' },
                { criterion: 'Recommends integration notifications via Workday Integration Alerts or email notifications on failure', maxPoints: 5, guidance: 'Specific to Workday or generic email is both acceptable' },
                { criterion: 'Describes retry logic with maximum attempts and dead-letter handling', maxPoints: 5, guidance: 'Must address what happens after max retries' },
              ],
            },
          },
        ],
      },
    ],
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROLE TEMPLATES  (11–32) — mixed format with 2-3 coding questions each
  // ════════════════════════════════════════════════════════════════════════════

  await createAssessment(admin.id, {
    title: 'Java Backend Developer Assessment',
    description: 'Tests core Java, Spring Boot, OOP, concurrency, and API design.',
    roleType: 'java-developer',
    instructions: 'Answer all questions. Coding questions may be in Java.',
    timeLimit: 75, passingScore: 70,
    templateSlug: 'java-developer-starter',
    sections: [
      {
        title: 'Core Java',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Java Memory Model', body: 'Which area of JVM memory stores class-level static variables?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['java', 'jvm', 'memory'], config: { options: [{ label: 'Heap', value: 'A' }, { label: 'Stack', value: 'B' }, { label: 'Method Area (Metaspace)', value: 'C' }, { label: 'Code Cache', value: 'D' }], correct: 'C', explanation: 'Static variables live in the Method Area / Metaspace.' } },
          { type: 'MULTIPLE_CHOICE', title: 'Checked vs Unchecked Exceptions', body: 'Which of the following is a checked exception?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['java', 'exceptions'], config: { options: [{ label: 'NullPointerException', value: 'A' }, { label: 'IOException', value: 'B' }, { label: 'ArrayIndexOutOfBoundsException', value: 'C' }, { label: 'ClassCastException', value: 'D' }], correct: 'B', explanation: 'IOException is a checked exception that must be declared or caught.' } },
          { type: 'CODING_CHALLENGE', title: 'Reverse a Linked List', body: 'Implement a method to reverse a singly linked list in Java.\n\nReturn the new head node.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['java', 'data-structures', 'linked-list'], config: { language: 'java', starterCode: 'class Solution {\n    public ListNode reverseList(ListNode head) {\n        // your code here\n    }\n}', testCases: [] } },
        ],
      },
      {
        title: 'Spring Boot & REST APIs',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Spring Bean Scope', body: 'What is the default scope of a Spring bean?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['spring', 'beans'], config: { options: [{ label: 'Prototype', value: 'A' }, { label: 'Singleton', value: 'B' }, { label: 'Request', value: 'C' }, { label: 'Session', value: 'D' }], correct: 'B', explanation: 'Spring beans are singleton by default — one instance per application context.' } },
          { type: 'SHORT_ANSWER', title: 'Explain @Transactional', body: 'What does @Transactional do in Spring, and when would you use it?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['spring', 'transactions', 'database'], config: {} },
          { type: 'SCENARIO', title: 'Design a REST API for User Management', body: 'Design RESTful endpoints for a User Management service (CRUD operations). Include HTTP methods, URL patterns, request/response shapes, and status codes.', points: 20, difficulty: 'hard', evaluator: 'manual', skillTags: ['rest', 'api-design', 'spring'], config: { rubric: [{ criterion: 'Correct HTTP verbs (GET/POST/PUT/DELETE)', maxPoints: 5, guidance: '' }, { criterion: 'Proper URL structure (/users, /users/{id})', maxPoints: 5, guidance: '' }, { criterion: 'Meaningful status codes (201, 404, 400)', maxPoints: 5, guidance: '' }, { criterion: 'Request/response body design', maxPoints: 5, guidance: '' }] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Thread-Safe Singleton', body: `Implement a thread-safe Singleton pattern in Java using double-checked locking.

The \`getInstance()\` method must be safe to call from multiple threads simultaneously without creating more than one instance.`, points: 20, difficulty: 'hard', skillTags: ['java', 'concurrency', 'design-patterns'], config: { language: 'java', starterCode: `public class DatabaseConnection {
    private static DatabaseConnection instance;
    private final String connectionString;

    private DatabaseConnection(String url) {
        this.connectionString = url;
    }

    public static DatabaseConnection getInstance(String url) {
        // Implement thread-safe singleton here
        return null;
    }

    public String getConnectionString() { return connectionString; }
}`, testCases: [] } },
        ],
      },
      {
        title: 'Coding Challenges',
        description: 'Practical Java problems found in real production work.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Find Duplicate Files', body: `You have a list of file paths. Write a method that groups files with identical content (represented as a string hash) together and returns only the groups that have duplicates.

Input: \`["a/1.txt:abc", "b/2.txt:def", "c/3.txt:abc"]\` (format: path:hash)
Output: \`[["a/1.txt", "c/3.txt"]]\``, points: 20, difficulty: 'medium', skillTags: ['java', 'collections', 'grouping'], config: { language: 'java', starterCode: `import java.util.*;

public class Solution {
    public List<List<String>> findDuplicates(String[] files) {
        // your code here
        return new ArrayList<>();
    }
}`, testCases: [] } },
          { type: 'DEBUGGING_CHALLENGE', evaluator: 'code', title: 'Fix the ConcurrentModificationException', body: `This code throws a ConcurrentModificationException at runtime. Find the bug and fix it.

\`\`\`java
public List<String> removeShortNames(List<String> names) {
    for (String name : names) {
        if (name.length() < 4) {
            names.remove(name); // This line causes the issue
        }
    }
    return names;
}
\`\`\``, points: 15, difficulty: 'medium', skillTags: ['java', 'collections', 'debugging'], config: { language: 'java', starterCode: `import java.util.*;

public class Solution {
    public List<String> removeShortNames(List<String> names) {
        // Fix the bug - cannot modify a list while iterating it with for-each
        for (String name : names) {
            if (name.length() < 4) {
                names.remove(name);
            }
        }
        return names;
    }
}`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'C# / .NET Developer Assessment',
    description: 'Tests C#, ASP.NET Core, LINQ, async/await, and .NET best practices.',
    roleType: 'dotnet-developer',
    instructions: 'Complete all sections. Coding answers should use C#.',
    timeLimit: 75, passingScore: 70,
    templateSlug: 'dotnet-developer-starter',
    sections: [
      {
        title: 'C# Fundamentals',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Value vs Reference Types', body: 'Which of the following is a value type in C#?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['csharp', 'types'], config: { options: [{ label: 'string', value: 'A' }, { label: 'int', value: 'B' }, { label: 'List<T>', value: 'C' }, { label: 'object', value: 'D' }], correct: 'B', explanation: 'int is a struct (value type). string is a reference type despite immutable behaviour.' } },
          { type: 'MULTIPLE_CHOICE', title: 'async/await', body: 'What does `await` do when used with a Task?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['csharp', 'async'], config: { options: [{ label: 'Blocks the current thread until the Task completes', value: 'A' }, { label: 'Returns control to the caller and resumes after the Task completes', value: 'B' }, { label: 'Creates a new thread', value: 'C' }, { label: 'Cancels the Task', value: 'D' }], correct: 'B', explanation: 'await suspends the method without blocking the thread, resuming on completion.' } },
          { type: 'CODING_CHALLENGE', title: 'LINQ Query', body: 'Given a list of integers, use LINQ to return the distinct even numbers sorted in descending order.\n\n```csharp\nList<int> numbers = new List<int> { 5, 2, 8, 2, 3, 8, 1, 6 };\n```', points: 15, difficulty: 'medium', evaluator: 'code', skillTags: ['csharp', 'linq'], config: { language: 'csharp', starterCode: 'using System.Linq;\nvar result = numbers\n    // your LINQ here\n    ;', testCases: [] } },
        ],
      },
      {
        title: 'ASP.NET Core & Architecture',
        questions: [
          { type: 'SHORT_ANSWER', title: 'Dependency Injection in .NET', body: 'Explain how dependency injection works in ASP.NET Core. What are the three service lifetimes?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['dotnet', 'di', 'aspnet'], config: {} },
          { type: 'SCENARIO', title: 'Design a Middleware Pipeline', body: 'You need to add logging, authentication, and exception handling to an ASP.NET Core app. Describe the middleware order and why it matters.', points: 20, difficulty: 'hard', evaluator: 'manual', skillTags: ['aspnet', 'middleware', 'architecture'], config: { rubric: [{ criterion: 'Correct middleware order (exception handling first)', maxPoints: 7, guidance: '' }, { criterion: 'Explains why order matters for request/response pipeline', maxPoints: 7, guidance: '' }, { criterion: 'Mentions UseAuthentication before UseAuthorization', maxPoints: 6, guidance: '' }] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Generic Repository with EF Core', body: `Implement a generic repository interface and its base implementation using Entity Framework Core.

Requirements:
- \`IRepository<T>\` interface with: \`GetByIdAsync\`, \`GetAllAsync\`, \`AddAsync\`, \`UpdateAsync\`, \`DeleteAsync\`
- \`BaseRepository<T>\` class implementing the interface using \`DbContext\``, points: 25, difficulty: 'hard', skillTags: ['csharp', 'ef-core', 'repository-pattern', 'architecture'], config: { language: 'csharp', starterCode: `public interface IRepository<T> where T : class
{
    // Define interface members
}

public class BaseRepository<T> : IRepository<T> where T : class
{
    private readonly DbContext _context;

    public BaseRepository(DbContext context)
    {
        _context = context;
    }
    // Implement the interface
}`, testCases: [] } },
        ],
      },
      {
        title: 'Coding Challenges',
        description: 'Real production C# scenarios.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Async API Controller with Validation', body: `Write an ASP.NET Core controller action that:
1. Accepts a POST body with \`{ email: string, amount: decimal }\`
2. Validates both fields (email format, amount > 0)
3. Returns 400 with error details if invalid
4. Calls an async \`_paymentService.ProcessAsync(email, amount)\`
5. Returns 201 on success with the transaction ID`, points: 20, difficulty: 'medium', skillTags: ['csharp', 'aspnet', 'validation', 'async'], config: { language: 'csharp', starterCode: `[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost]
    public async Task<IActionResult> ProcessPayment([FromBody] PaymentRequest request)
    {
        // Implement validation and business logic
    }
}

public class PaymentRequest
{
    public string Email { get; set; }
    public decimal Amount { get; set; }
}`, testCases: [] } },
          { type: 'DEBUGGING_CHALLENGE', evaluator: 'code', title: 'Fix the Deadlock', body: `This code causes a deadlock in ASP.NET Core. Identify the bug and fix it.

\`\`\`csharp
public string GetUserName(int userId)
{
    // Calling async method synchronously — causes deadlock in ASP.NET
    var user = _userService.GetUserAsync(userId).Result;
    return user.Name;
}
\`\`\``, points: 15, difficulty: 'medium', skillTags: ['csharp', 'async', 'deadlock', 'debugging'], config: { language: 'csharp', starterCode: `// Fix: make the method async and await properly
public string GetUserName(int userId)
{
    var user = _userService.GetUserAsync(userId).Result; // Fix this
    return user.Name;
}`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'Azure Cloud Engineer Assessment',
    description: 'Tests Azure services, architecture, IaC, and cloud-native patterns.',
    roleType: 'azure-engineer',
    instructions: 'Answer all questions based on Microsoft Azure.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'azure-engineer-starter',
    sections: [
      {
        title: 'Azure Core Services',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Azure Storage Types', body: 'Which Azure storage service is best suited for storing unstructured blob data like images and videos?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['azure', 'storage'], config: { options: [{ label: 'Azure SQL Database', value: 'A' }, { label: 'Azure Blob Storage', value: 'B' }, { label: 'Azure Table Storage', value: 'C' }, { label: 'Azure Queue Storage', value: 'D' }], correct: 'B', explanation: 'Azure Blob Storage is optimised for large-scale unstructured binary data.' } },
          { type: 'MULTIPLE_CHOICE', title: 'Azure Functions Trigger', body: 'Which trigger type causes an Azure Function to run on a schedule?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['azure', 'functions', 'serverless'], config: { options: [{ label: 'HTTP Trigger', value: 'A' }, { label: 'Timer Trigger', value: 'B' }, { label: 'Queue Trigger', value: 'C' }, { label: 'Blob Trigger', value: 'D' }], correct: 'B', explanation: 'Timer Trigger uses a CRON expression to schedule execution.' } },
          { type: 'SHORT_ANSWER', title: 'Azure Active Directory vs Entra ID', body: 'What is Microsoft Entra ID (formerly Azure AD) and how is it used for authentication in Azure applications?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['azure', 'identity', 'security'], config: {} },
        ],
      },
      {
        title: 'Architecture & IaC',
        questions: [
          { type: 'SCENARIO', title: 'Design a Highly Available Web App on Azure', body: 'Design an Azure architecture for a web application that requires 99.9% uptime, auto-scaling, and a managed database. Include the Azure services you would use and why.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['azure', 'architecture', 'high-availability'], config: { rubric: [{ criterion: 'Uses App Service or AKS for hosting with auto-scale', maxPoints: 7, guidance: '' }, { criterion: 'Includes Azure SQL / Cosmos DB with geo-redundancy', maxPoints: 6, guidance: '' }, { criterion: 'Front Door or Application Gateway for load balancing', maxPoints: 6, guidance: '' }, { criterion: 'Mentions Azure Monitor / Application Insights', maxPoints: 6, guidance: '' }] } },
          { type: 'SHORT_ANSWER', title: 'Bicep vs Terraform for Azure IaC', body: 'Compare Azure Bicep and Terraform for infrastructure as code. When would you choose one over the other?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['azure', 'iac', 'terraform', 'bicep'], config: {} },
        ],
      },
      {
        title: 'Coding & Configuration Challenges',
        description: 'Write real Azure infrastructure code and scripts.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Azure Function — Process Queue Messages', body: `Write an Azure Function in C# (or Python) that:
1. Triggers on messages from an Azure Service Bus queue named "orders"
2. Deserializes the message JSON into an \`Order\` object with \`{ orderId, customerId, amount }\`
3. Logs the order details
4. Throws an exception (to trigger dead-lettering) if amount <= 0`, points: 20, difficulty: 'medium', skillTags: ['azure', 'functions', 'service-bus', 'serverless'], config: { language: 'csharp', starterCode: `using Azure.Messaging.ServiceBus;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

public class OrderProcessor
{
    private readonly ILogger<OrderProcessor> _logger;

    public OrderProcessor(ILogger<OrderProcessor> logger) => _logger = logger;

    [Function("ProcessOrder")]
    public void Run(
        [ServiceBusTrigger("orders", Connection = "ServiceBusConnection")] string messageBody,
        FunctionContext context)
    {
        // Implement message processing
    }
}`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Bicep — App Service + SQL Database', body: `Write a Bicep template that deploys:
1. An Azure App Service Plan (B1 SKU)
2. An App Service with a connection string pointing to the database
3. An Azure SQL Server + Database (Basic SKU)
4. A Key Vault to store the SQL connection string securely

Use parameters for: environment name, location, admin SQL password.`, points: 25, difficulty: 'hard', skillTags: ['azure', 'bicep', 'iac', 'app-service', 'sql'], config: { language: 'bash', starterCode: `// Bicep template
param environment string
param location string = resourceGroup().location
@secure()
param sqlAdminPassword string

// Define your resources below:
// 1. App Service Plan
// 2. App Service
// 3. SQL Server + Database
// 4. Key Vault`, testCases: [] } },
          { type: 'DEBUGGING_CHALLENGE', evaluator: 'code', title: 'Fix the ARM CORS Policy', body: `This Azure Function App ARM template has a misconfigured CORS policy that blocks all browser requests. Find and fix the issue.

\`\`\`json
{
  "properties": {
    "siteConfig": {
      "cors": {
        "allowedOrigins": [],
        "supportCredentials": true
      }
    }
  }
}
\`\`\`

The app should allow requests from https://myapp.azurestaticapps.net only.`, points: 15, difficulty: 'medium', skillTags: ['azure', 'cors', 'arm', 'debugging'], config: { language: 'bash', starterCode: `// Fix the CORS configuration in this ARM/Bicep snippet:
cors: {
  allowedOrigins: []  // Fix this
  supportCredentials: true
}`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'Ruby on Rails Developer Assessment',
    description: 'Tests Ruby language fundamentals, Rails conventions, ActiveRecord, and API design.',
    roleType: 'rails-developer',
    instructions: 'Answer all questions. Code should be written in Ruby.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'rails-developer-starter',
    sections: [
      {
        title: 'Ruby & Rails Fundamentals',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'ActiveRecord Associations', body: 'A User `has_many :posts` and a Post `belongs_to :user`. Which query fetches all posts for a user without N+1 queries?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['rails', 'activerecord', 'n+1'], config: { options: [{ label: 'User.all.map { |u| u.posts }', value: 'A' }, { label: 'User.includes(:posts).all', value: 'B' }, { label: 'Post.where(user_id: User.all)', value: 'C' }, { label: 'User.joins(:posts)', value: 'D' }], correct: 'B', explanation: 'includes eager-loads associations to prevent N+1.' } },
          { type: 'CODING_CHALLENGE', title: 'Ruby Enumerable', body: 'Given an array of hashes representing products, use Ruby to return the names of all products with a price > 100, sorted alphabetically.\n\n```ruby\nproducts = [\n  { name: "Widget", price: 50 },\n  { name: "Gadget", price: 150 },\n  { name: "Doohickey", price: 200 }\n]\n```', points: 15, difficulty: 'easy', evaluator: 'code', skillTags: ['ruby', 'enumerable'], config: { language: 'ruby', starterCode: '# Return array of names\ndef expensive_products(products)\n  # your code\nend', testCases: [] } },
          { type: 'SHORT_ANSWER', title: 'Rails Middleware and Rack', body: 'What is Rack in Rails? How would you add custom middleware to a Rails application?', points: 15, difficulty: 'hard', evaluator: 'manual', skillTags: ['rails', 'rack', 'middleware'], config: {} },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Soft Delete Concern', body: `Write a Rails \`SoftDeletable\` concern that:
1. Adds a \`deleted_at\` datetime column scope
2. Overrides \`destroy\` to set \`deleted_at\` instead of deleting
3. Adds a \`restore!\` method to undo soft delete
4. Adds \`default_scope\` to hide soft-deleted records from normal queries
5. Adds a \`.with_deleted\` scope to include them when needed`, points: 20, difficulty: 'medium', skillTags: ['ruby', 'rails', 'concerns', 'soft-delete'], config: { language: 'ruby', starterCode: `module SoftDeletable
  extend ActiveSupport::Concern

  included do
    # your scopes and callbacks here
  end

  def destroy
    # implement soft delete
  end

  def restore!
    # implement restore
  end
end`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Sidekiq Background Job', body: `Write a Sidekiq worker class \`SendWelcomeEmailJob\` that:
1. Accepts a \`user_id\` argument
2. Finds the user by ID (raise if not found)
3. Calls \`UserMailer.welcome_email(user).deliver_now\`
4. Logs success/failure
5. Configure it to retry 3 times with exponential backoff, and give up after 3 retries`, points: 20, difficulty: 'medium', skillTags: ['ruby', 'rails', 'sidekiq', 'background-jobs'], config: { language: 'ruby', starterCode: `class SendWelcomeEmailJob
  include Sidekiq::Worker

  # Configure retry and backoff options here

  def perform(user_id)
    # implement the job
  end
end`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'DevOps Engineer Assessment',
    description: 'Tests CI/CD, containers, Kubernetes, infrastructure as code, and SRE practices.',
    roleType: 'devops-engineer',
    instructions: 'Answer all sections. Focus on practical, production-ready approaches.',
    timeLimit: 75, passingScore: 70,
    templateSlug: 'devops-engineer-starter',
    sections: [
      {
        title: 'CI/CD & Containers',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Docker Layer Caching', body: 'To optimise Docker build caching, where should you copy package.json and run npm install relative to copying the rest of the source code?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['docker', 'ci-cd', 'caching'], config: { options: [{ label: 'After copying all source files', value: 'A' }, { label: 'Before copying the rest of source files', value: 'B' }, { label: 'In a separate stage using multi-stage build', value: 'C' }, { label: 'Order does not matter', value: 'D' }], correct: 'B', explanation: 'Copying package files first and installing deps before the rest of the source maximises cache reuse.' } },
          { type: 'SCENARIO', title: 'Design a CI/CD Pipeline', body: 'Design a CI/CD pipeline for a Node.js microservice that needs: automated tests, Docker build, security scanning, and deployment to Kubernetes on merge to main. Describe each stage and tooling choices.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['ci-cd', 'kubernetes', 'devops'], config: { rubric: [{ criterion: 'Test stage with lint and unit tests', maxPoints: 6, guidance: '' }, { criterion: 'Docker build and push to registry', maxPoints: 6, guidance: '' }, { criterion: 'Security scanning (SAST/container scan)', maxPoints: 6, guidance: '' }, { criterion: 'Kubernetes deployment with rollback strategy', maxPoints: 7, guidance: '' }] } },
        ],
      },
      {
        title: 'Kubernetes & IaC',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Kubernetes Pod vs Deployment', body: 'What is the primary advantage of using a Deployment over creating Pods directly?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['kubernetes', 'deployments'], config: { options: [{ label: 'Deployments are faster to create', value: 'A' }, { label: 'Deployments provide self-healing and rolling updates', value: 'B' }, { label: 'Deployments use less memory', value: 'C' }, { label: 'Pods cannot run containers', value: 'D' }], correct: 'B', explanation: 'Deployments manage ReplicaSets to ensure desired state and support rolling updates.' } },
          { type: 'SHORT_ANSWER', title: 'Terraform State Management', body: 'What is Terraform state and what problems arise from storing it locally in a team environment? What is the recommended solution?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['terraform', 'iac', 'state'], config: {} },
        ],
      },
      {
        title: 'Coding & Configuration Challenges',
        description: 'Write production-grade DevOps configs and scripts.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Multi-Stage Dockerfile for Node.js', body: `Write an optimised multi-stage Dockerfile for a Node.js TypeScript application that:
1. Uses a \`builder\` stage to install deps and compile TypeScript to \`dist/\`
2. Uses a minimal \`node:20-alpine\` production stage
3. Only copies \`dist/\` and \`node_modules\` (prod only) to the final image
4. Runs as a non-root user
5. Exposes port 3000 and sets the CMD

The repo structure: \`package.json\`, \`tsconfig.json\`, \`src/index.ts\``, points: 20, difficulty: 'medium', skillTags: ['docker', 'nodejs', 'multi-stage', 'security'], config: { language: 'bash', starterCode: `# Write your multi-stage Dockerfile here

# Stage 1: Builder
FROM node:20-alpine AS builder
# ...

# Stage 2: Production
FROM node:20-alpine AS production
# ...`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Kubernetes Deployment + HPA', body: `Write Kubernetes YAML manifests for a Node.js API service:

1. **Deployment**: 3 replicas, image \`myapp:1.0\`, port 3000, CPU/memory limits (250m/256Mi), liveness + readiness probes on \`/health\`
2. **Service**: ClusterIP on port 80 targeting 3000
3. **HorizontalPodAutoscaler**: Scale 2–10 replicas at 70% CPU utilization`, points: 20, difficulty: 'medium', skillTags: ['kubernetes', 'hpa', 'deployments', 'probes'], config: { language: 'bash', starterCode: `# Write 3 YAML documents separated by ---

# Deployment
apiVersion: apps/v1
kind: Deployment
# ...

---
# Service
# ...

---
# HPA
# ...`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'GitHub Actions CI/CD Pipeline', body: `Write a GitHub Actions workflow (\`.github/workflows/deploy.yml\`) that:
1. Triggers on push to \`main\`
2. Runs on \`ubuntu-latest\`
3. **test** job: runs \`npm ci\` and \`npm test\`
4. **build-push** job (needs test): builds a Docker image tagged with the git SHA and pushes to GHCR
5. **deploy** job (needs build-push): runs \`kubectl set image deployment/myapp myapp=ghcr.io/org/myapp:$SHA\`

Use GitHub secrets for \`KUBE_CONFIG\`.`, points: 25, difficulty: 'hard', skillTags: ['github-actions', 'ci-cd', 'docker', 'kubernetes'], config: { language: 'bash', starterCode: `name: CI/CD

on:
  push:
    branches: [main]

jobs:
  test:
    # ...

  build-push:
    # ...

  deploy:
    # ...`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'QA / Test Engineer Assessment',
    description: 'Tests manual testing, test automation, API testing, and QA strategy.',
    roleType: 'qa-engineer',
    instructions: 'Answer all questions honestly — there are no trick questions.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'qa-engineer-starter',
    sections: [
      {
        title: 'Testing Fundamentals',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Testing Pyramid', body: 'According to the testing pyramid, which type of test should you have the most of?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['testing', 'strategy'], config: { options: [{ label: 'E2E / UI Tests', value: 'A' }, { label: 'Integration Tests', value: 'B' }, { label: 'Unit Tests', value: 'C' }, { label: 'Manual Tests', value: 'D' }], correct: 'C', explanation: 'The testing pyramid recommends many cheap unit tests at the base, fewer integration, fewest E2E.' } },
          { type: 'SHORT_ANSWER', title: 'Writing a Test Plan', body: 'A new "forgot password" feature is being released. Write a brief test plan covering functional, edge case, and security test scenarios.', points: 20, difficulty: 'medium', evaluator: 'manual', skillTags: ['test-planning', 'qa'], config: {} },
          { type: 'SCENARIO', title: 'Bug Report Quality', body: 'You find a bug where submitting a form with an empty email field shows a 500 error instead of a validation message. Write a complete, developer-ready bug report.', points: 20, difficulty: 'easy', evaluator: 'manual', skillTags: ['bug-reporting', 'qa'], config: { rubric: [{ criterion: 'Clear title summarising the issue', maxPoints: 5, guidance: '' }, { criterion: 'Steps to reproduce (numbered)', maxPoints: 5, guidance: '' }, { criterion: 'Expected vs actual result', maxPoints: 5, guidance: '' }, { criterion: 'Environment, severity, and suggested fix', maxPoints: 5, guidance: '' }] } },
        ],
      },
      {
        title: 'Test Automation',
        questions: [
          { type: 'CODING_CHALLENGE', title: 'Playwright Login Test', body: 'Write a Playwright test that:\n1. Navigates to `/login`\n2. Fills in email and password\n3. Clicks the submit button\n4. Asserts the user is redirected to `/dashboard`\n5. Asserts the page contains "Welcome" text', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['playwright', 'automation', 'e2e'], config: { language: 'javascript', starterCode: "const { test, expect } = require('@playwright/test');\n\ntest('user can log in', async ({ page }) => {\n  // your code here\n});", testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Jest Unit Test with Mocks', body: `Write Jest unit tests for the following function. Mock the \`sendEmail\` dependency so no real emails are sent.

\`\`\`js
// src/notifications.js
const { sendEmail } = require('./email');

async function notifyUser(userId, message) {
  if (!userId || !message) throw new Error('userId and message required');
  const result = await sendEmail({ to: userId + '@example.com', body: message });
  return result.messageId;
}
module.exports = { notifyUser };
\`\`\`

Write tests for: happy path, missing userId, missing message, sendEmail failure.`, points: 20, difficulty: 'medium', skillTags: ['jest', 'unit-testing', 'mocking', 'node'], config: { language: 'javascript', starterCode: `const { notifyUser } = require('./notifications');
const { sendEmail } = require('./email');

jest.mock('./email');

describe('notifyUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should send email and return messageId for valid inputs', async () => {
    // arrange
    // act
    // assert
  });

  // Add more tests...
});`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'API Contract Test with Supertest', body: `Write a Supertest integration test for a POST /api/users endpoint that:
1. Returns 201 with \`{ id, email, createdAt }\` for valid input \`{ email, password }\`
2. Returns 400 with \`{ error: "Email already exists" }\` for duplicate email
3. Returns 422 with validation errors for missing/invalid fields

Use Jest + Supertest. Assume \`app\` is exported from \`./app.js\`.`, points: 20, difficulty: 'hard', skillTags: ['supertest', 'api-testing', 'integration-testing'], config: { language: 'javascript', starterCode: `const request = require('supertest');
const app = require('./app');

describe('POST /api/users', () => {
  it('creates a user with valid data', async () => {
    // your test
  });

  it('returns 400 for duplicate email', async () => {
    // your test
  });

  it('returns 422 for invalid input', async () => {
    // your test
  });
});`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'Network Security Engineer Assessment',
    description: 'Tests network protocols, security concepts, threat analysis, and security tooling.',
    roleType: 'network-security',
    instructions: 'Answer all questions based on current industry best practices.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'network-security-starter',
    sections: [
      {
        title: 'Security Fundamentals',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'OSI Model — Attack Surface', body: 'A SQL injection attack primarily targets which OSI layer?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['security', 'osi', 'sql-injection'], config: { options: [{ label: 'Layer 3 — Network', value: 'A' }, { label: 'Layer 4 — Transport', value: 'B' }, { label: 'Layer 7 — Application', value: 'C' }, { label: 'Layer 2 — Data Link', value: 'D' }], correct: 'C', explanation: 'SQL injection exploits application logic at Layer 7.' } },
          { type: 'MULTIPLE_CHOICE', title: 'Zero Trust Model', body: 'What is the core principle of Zero Trust security?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['security', 'zero-trust'], config: { options: [{ label: 'Trust users inside the corporate network by default', value: 'A' }, { label: 'Never trust, always verify — regardless of network location', value: 'B' }, { label: 'Block all external traffic', value: 'C' }, { label: 'Use VPN for all connections', value: 'D' }], correct: 'B', explanation: 'Zero Trust assumes no implicit trust based on network location.' } },
          { type: 'SCENARIO', title: 'Incident Response Plan', body: 'Your company detects unusual outbound traffic from an internal server at 2am. Walk through your incident response process from detection to resolution.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['incident-response', 'security', 'forensics'], config: { rubric: [{ criterion: 'Immediate containment (isolate the host)', maxPoints: 7, guidance: '' }, { criterion: 'Evidence collection and logging review', maxPoints: 6, guidance: '' }, { criterion: 'Root cause analysis', maxPoints: 6, guidance: '' }, { criterion: 'Remediation and post-incident review', maxPoints: 6, guidance: '' }] } },
        ],
      },
      {
        title: 'Security Scripting & Configuration',
        description: 'Hands-on security engineering tasks.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Port Scanner in Python', body: `Write a Python function \`scan_ports(host, ports)\` that:
1. Accepts a hostname/IP and a list of port numbers
2. Attempts a TCP connection to each port with a 1-second timeout
3. Returns a dict \`{ port: "open" | "closed" }\`
4. Runs port checks concurrently using \`concurrent.futures.ThreadPoolExecutor\`

Example: \`scan_ports("192.168.1.1", [22, 80, 443, 8080])\``, points: 20, difficulty: 'medium', skillTags: ['python', 'networking', 'security-tooling', 'concurrency'], config: { language: 'python', starterCode: `import socket
from concurrent.futures import ThreadPoolExecutor

def scan_ports(host: str, ports: list[int]) -> dict[int, str]:
    # your implementation here
    pass`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Detect Brute Force in Log File', body: `Write a Python function \`detect_brute_force(log_lines, threshold=5, window_seconds=60)\` that:
1. Parses lines in the format: \`2024-01-15 10:23:45 FAIL 192.168.1.100 /login\`
2. Returns a list of IPs that had \`threshold\` or more failed login attempts within any \`window_seconds\` sliding window
3. Sort results by number of attempts descending`, points: 25, difficulty: 'hard', skillTags: ['python', 'security', 'log-analysis', 'brute-force-detection'], config: { language: 'python', starterCode: `from datetime import datetime
from collections import defaultdict

def detect_brute_force(log_lines: list[str], threshold: int = 5, window_seconds: int = 60) -> list[str]:
    # Parse logs and find brute force attackers
    pass`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'iptables Firewall Rules', body: `Write iptables rules (or equivalent nftables/ufw commands) to implement this security policy for a web server:

1. Allow all established/related connections
2. Allow SSH (port 22) only from the admin subnet 10.0.1.0/24
3. Allow HTTP (80) and HTTPS (443) from anywhere
4. Allow ICMP ping from anywhere (rate-limited to 5/second)
5. Drop all other incoming traffic
6. Log dropped packets to syslog

Write the commands in order, explaining each rule.`, points: 20, difficulty: 'medium', skillTags: ['linux', 'iptables', 'firewall', 'network-security'], config: { language: 'bash', starterCode: `#!/bin/bash
# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Add your rules below:`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'Machine Learning Engineer Assessment',
    description: 'Tests ML fundamentals, model training, evaluation, feature engineering, and MLOps.',
    roleType: 'ml-engineer',
    instructions: 'Answer all questions. Code may be Python/NumPy/Pandas/scikit-learn.',
    timeLimit: 75, passingScore: 70,
    templateSlug: 'ml-engineer-starter',
    sections: [
      {
        title: 'ML Fundamentals',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Bias-Variance Tradeoff', body: 'A model that performs well on training data but poorly on test data is suffering from:', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['ml', 'bias-variance'], config: { options: [{ label: 'High bias', value: 'A' }, { label: 'High variance (overfitting)', value: 'B' }, { label: 'Underfitting', value: 'C' }, { label: 'Data leakage', value: 'D' }], correct: 'B', explanation: 'High variance / overfitting means the model memorised training data and generalises poorly.' } },
          { type: 'MULTIPLE_CHOICE', title: 'Cross-Validation', body: 'What is the purpose of k-fold cross-validation?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['ml', 'evaluation', 'cross-validation'], config: { options: [{ label: 'To speed up model training', value: 'A' }, { label: 'To get a more reliable estimate of model performance on unseen data', value: 'B' }, { label: 'To prevent gradient vanishing', value: 'C' }, { label: 'To normalise features', value: 'D' }], correct: 'B', explanation: 'k-fold CV gives a robust performance estimate by training/evaluating on different data splits.' } },
          { type: 'CODING_CHALLENGE', title: 'Feature Normalisation', body: 'Write a Python function that normalises a list of numbers to the range [0, 1] using min-max scaling.\n\nExample: `[10, 20, 30]` → `[0.0, 0.5, 1.0]`', points: 15, difficulty: 'easy', evaluator: 'code', skillTags: ['python', 'ml', 'feature-engineering'], config: { language: 'python', starterCode: 'def min_max_scale(values):\n    # your code here\n    pass', testCases: [{ input: '[10, 20, 30]', expectedOutput: '[0.0, 0.5, 1.0]' }] } },
        ],
      },
      {
        title: 'Model Design & MLOps',
        questions: [
          { type: 'SCENARIO', title: 'ML System Design', body: 'Design an end-to-end ML pipeline to predict customer churn for a SaaS product. Include: data sources, feature engineering, model selection, training, evaluation, and deployment considerations.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['ml', 'mlops', 'system-design'], config: { rubric: [{ criterion: 'Identifies relevant features (usage, billing, support tickets)', maxPoints: 6, guidance: '' }, { criterion: 'Appropriate model choice with justification', maxPoints: 6, guidance: '' }, { criterion: 'Evaluation metrics (precision, recall, AUC for imbalanced classes)', maxPoints: 7, guidance: '' }, { criterion: 'Deployment and monitoring strategy', maxPoints: 6, guidance: '' }] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Train & Evaluate a Classifier', body: `Write a Python function that:
1. Loads the provided dataset (X: features array, y: labels array)
2. Splits it 80/20 train/test with stratification and random_state=42
3. Trains a Random Forest classifier
4. Returns a dict: \`{ accuracy, precision, recall, f1, confusion_matrix }\` on the test set

Use scikit-learn. The dataset may be class-imbalanced.`, points: 20, difficulty: 'medium', skillTags: ['python', 'scikit-learn', 'classification', 'model-evaluation'], config: { language: 'python', starterCode: `from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import numpy as np

def train_and_evaluate(X: np.ndarray, y: np.ndarray) -> dict:
    # Your implementation
    pass`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Custom Preprocessing Pipeline', body: `Write a scikit-learn Pipeline that preprocesses a mixed dataset (numeric + categorical) for a classification model:

1. Numeric columns: impute missing with median, then StandardScaler
2. Categorical columns: impute missing with most frequent, then OneHotEncoder (handle_unknown='ignore')
3. Combine with ColumnTransformer
4. Append a LogisticRegression estimator at the end
5. Return a fitted pipeline

Columns: numeric = ['age', 'income', 'tenure'], categorical = ['plan', 'region']`, points: 25, difficulty: 'hard', skillTags: ['python', 'scikit-learn', 'pipeline', 'feature-engineering'], config: { language: 'python', starterCode: `from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
import pandas as pd

NUMERIC_COLS = ['age', 'income', 'tenure']
CATEGORICAL_COLS = ['plan', 'region']

def build_pipeline() -> Pipeline:
    # Build and return the pipeline
    pass`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'LLM / AI Engineer Assessment',
    description: 'Tests prompt engineering, RAG architecture, LLM APIs, fine-tuning concepts, and AI safety.',
    roleType: 'ai-llm-engineer',
    instructions: 'Answer all questions. Practical experience with LLM APIs is expected.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'ai-llm-engineer-starter',
    sections: [
      {
        title: 'Prompt Engineering & LLM APIs',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'Temperature Parameter', body: 'What effect does setting `temperature=0` have on an LLM\'s output?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['llm', 'prompt-engineering'], config: { options: [{ label: 'Makes the output more creative and random', value: 'A' }, { label: 'Makes the output deterministic and focused on the highest-probability tokens', value: 'B' }, { label: 'Speeds up inference', value: 'C' }, { label: 'Reduces token count', value: 'D' }], correct: 'B', explanation: 'Temperature=0 makes the model greedy, always picking the most probable next token.' } },
          { type: 'CODING_CHALLENGE', title: 'Build a Chat Completion Call', body: 'Write Python code that calls an OpenAI-compatible chat completion API to answer a user\'s question. Include a system prompt that instructs the model to respond concisely and only in English.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['llm', 'openai', 'api'], config: { language: 'python', starterCode: 'import openai\n\nclient = openai.OpenAI(api_key="YOUR_KEY")\n\ndef ask(question: str) -> str:\n    # your code here\n    pass', testCases: [] } },
          { type: 'SHORT_ANSWER', title: 'Hallucination Mitigation', body: 'What are three concrete techniques to reduce hallucinations when using an LLM in a production application?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['llm', 'hallucination', 'rag'], config: {} },
        ],
      },
      {
        title: 'RAG & Architecture',
        questions: [
          { type: 'SCENARIO', title: 'Design a RAG System', body: 'Design a Retrieval-Augmented Generation (RAG) system for a company knowledge base with 10,000 documents. Include: document ingestion, chunking strategy, vector store, retrieval, and response generation.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['rag', 'vector-db', 'llm', 'architecture'], config: { rubric: [{ criterion: 'Document chunking strategy with overlap', maxPoints: 6, guidance: '' }, { criterion: 'Embedding model selection and vector store', maxPoints: 6, guidance: '' }, { criterion: 'Retrieval strategy (semantic + keyword hybrid)', maxPoints: 7, guidance: '' }, { criterion: 'Prompt construction and answer generation', maxPoints: 6, guidance: '' }] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Build a Simple RAG Pipeline', body: `Write a Python function \`answer_question(question, docs)\` that implements a basic RAG pipeline:
1. Embed the question using \`embed(text) -> list[float]\` (provided)
2. Embed each doc in \`docs\` (list of strings) and compute cosine similarity
3. Retrieve the top-3 most similar docs
4. Call \`llm_complete(prompt) -> str\` with a prompt that includes the context
5. Return the LLM's answer

Helper functions \`embed(text)\` and \`llm_complete(prompt)\` are available as imports.`, points: 25, difficulty: 'hard', skillTags: ['python', 'rag', 'embeddings', 'llm'], config: { language: 'python', starterCode: `from helpers import embed, llm_complete
import math

def cosine_similarity(a: list[float], b: list[float]) -> float:
    # implement cosine similarity
    pass

def answer_question(question: str, docs: list[str]) -> str:
    # 1. Embed question
    # 2. Embed docs and find top-3
    # 3. Build prompt with context
    # 4. Call llm_complete and return answer
    pass`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Prompt Chain with Tool Calls', body: `Write a Python function \`research_and_summarize(topic)\` that:
1. Calls \`search_web(query) -> list[str]\` to get 5 results about the topic
2. For each result, calls \`extract_facts(text) -> list[str]\` to pull key facts
3. Deduplicates and combines all facts
4. Calls \`llm_summarize(facts) -> str\` to produce a final summary
5. Returns the summary with a \`sources_count\` metadata dict

This tests your ability to orchestrate multi-step LLM tool pipelines.`, points: 20, difficulty: 'medium', skillTags: ['python', 'llm', 'prompt-chaining', 'orchestration'], config: { language: 'python', starterCode: `from tools import search_web, extract_facts, llm_summarize

def research_and_summarize(topic: str) -> dict:
    """Returns { 'summary': str, 'sources_count': int }"""
    # implement the pipeline
    pass`, testCases: [] } },
        ],
      },
    ],
  });

  await createAssessment(admin.id, {
    title: 'AWS Cloud Engineer Assessment',
    description: 'Tests AWS services, architecture patterns, IAM, serverless, and cost optimisation.',
    roleType: 'aws-engineer',
    instructions: 'Answer based on AWS best practices and Well-Architected Framework.',
    timeLimit: 60, passingScore: 70,
    templateSlug: 'aws-engineer-starter',
    sections: [
      {
        title: 'AWS Core Services',
        questions: [
          { type: 'MULTIPLE_CHOICE', title: 'S3 vs EBS vs EFS', body: 'Which AWS storage service is best for sharing files between multiple EC2 instances simultaneously?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['aws', 'storage'], config: { options: [{ label: 'Amazon S3', value: 'A' }, { label: 'Amazon EBS', value: 'B' }, { label: 'Amazon EFS', value: 'C' }, { label: 'AWS Glacier', value: 'D' }], correct: 'C', explanation: 'EFS (Elastic File System) is a managed NFS that can be mounted by multiple EC2 instances.' } },
          { type: 'MULTIPLE_CHOICE', title: 'IAM Policy Evaluation', body: 'If an IAM user has an explicit Deny on S3:DeleteObject and a separate policy with Allow on S3:*, what is the result when they try to delete an S3 object?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['aws', 'iam', 'security'], config: { options: [{ label: 'Allow — the Allow policy overrides', value: 'A' }, { label: 'Deny — explicit Deny always wins', value: 'B' }, { label: 'Depends on policy order', value: 'C' }, { label: 'Depends on resource ARN', value: 'D' }], correct: 'B', explanation: 'In AWS IAM, an explicit Deny always overrides any Allow.' } },
          { type: 'SCENARIO', title: 'Serverless Architecture Design', body: 'Design a serverless architecture on AWS for an API that processes image uploads, extracts metadata using ML, and stores results in a database. Use AWS-native services and explain your choices.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['aws', 'serverless', 'architecture'], config: { rubric: [{ criterion: 'S3 for upload + Lambda trigger', maxPoints: 7, guidance: '' }, { criterion: 'Amazon Rekognition or SageMaker for ML', maxPoints: 6, guidance: '' }, { criterion: 'DynamoDB or RDS for metadata storage', maxPoints: 6, guidance: '' }, { criterion: 'API Gateway + Lambda for the API layer', maxPoints: 6, guidance: '' }] } },
        ],
      },
      {
        title: 'Coding & Infrastructure Challenges',
        description: 'Write real AWS Lambda code and IaC configurations.',
        questions: [
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Lambda: Process S3 Upload Event', body: `Write an AWS Lambda function (Python) that:
1. Triggers when a file is uploaded to an S3 bucket
2. Reads the uploaded file content (assume it's a CSV)
3. Validates each row has \`name\`, \`email\`, \`amount\` columns
4. Writes valid rows to DynamoDB table "Transactions"
5. Returns the count of valid and invalid rows

Use boto3. The Lambda event object follows the standard S3 event format.`, points: 20, difficulty: 'medium', skillTags: ['aws', 'lambda', 's3', 'dynamodb', 'python'], config: { language: 'python', starterCode: `import boto3
import csv
import io

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
table = dynamodb.Table('Transactions')

def handler(event, context):
    # Get bucket and key from event
    # Download and parse CSV
    # Validate and write to DynamoDB
    pass`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'Terraform: ECS Fargate Service', body: `Write a Terraform configuration that deploys:

1. An ECS Cluster
2. A Fargate Task Definition running \`nginx:latest\` on port 80, with 256 CPU and 512MB memory
3. An ECS Service with 2 desired tasks in a given subnet
4. An Application Load Balancer with a target group pointing to port 80
5. A security group allowing HTTP (80) from 0.0.0.0/0 to the ALB

Use variables for: \`vpc_id\`, \`subnet_ids\`, \`cluster_name\`.`, points: 25, difficulty: 'hard', skillTags: ['aws', 'terraform', 'ecs', 'fargate', 'alb'], config: { language: 'bash', starterCode: `variable "vpc_id" {}
variable "subnet_ids" { type = list(string) }
variable "cluster_name" { default = "my-cluster" }

# Define your resources:
# 1. aws_ecs_cluster
# 2. aws_ecs_task_definition
# 3. aws_ecs_service
# 4. aws_lb + aws_lb_target_group + aws_lb_listener
# 5. aws_security_group`, testCases: [] } },
          { type: 'CODING_CHALLENGE', evaluator: 'code', title: 'AWS CDK: SNS → SQS → Lambda', body: `Write an AWS CDK stack (Python or TypeScript) that creates:
1. An SNS Topic for order events
2. An SQS Queue subscribed to the topic (with dead-letter queue after 3 failures)
3. A Lambda function that processes messages from the queue
4. Proper IAM permissions for each component
5. Export the SNS topic ARN as a stack output`, points: 20, difficulty: 'hard', skillTags: ['aws', 'cdk', 'sns', 'sqs', 'lambda'], config: { language: 'javascript', starterCode: `import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class OrderProcessingStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Define your infrastructure here
  }
}`, testCases: [] } },
        ],
      },
    ],
  });

  // ── Additional Role Templates (improved with 2-3 coding Qs each) ─────────

  await createAssessment(admin.id, {
    title: 'Go (Golang) Developer Assessment',
    description: 'Tests Go fundamentals, goroutines, interfaces, error handling, and REST API design.',
    roleType: 'go-developer', instructions: 'Answer all questions. Code should be written in Go.',
    timeLimit: 60, passingScore: 70, templateSlug: 'go-developer-starter',
    sections: [
      { title: 'Go Fundamentals', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Goroutine vs Thread', body: 'What is the primary advantage of goroutines over OS threads?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['go', 'concurrency'], config: { options: [{ label: 'Goroutines are faster to create and use less memory', value: 'A' }, { label: 'Goroutines run on separate CPU cores automatically', value: 'B' }, { label: 'Goroutines cannot block each other', value: 'C' }, { label: 'Goroutines support preemptive scheduling', value: 'D' }], correct: 'A', explanation: 'Goroutines are multiplexed onto OS threads by the Go runtime, using ~2KB vs ~1MB for OS threads.' } },
        { type: 'CODING_CHALLENGE', title: 'Concurrent Fan-Out', body: 'Write a Go function that takes a slice of URLs and fetches them all concurrently using goroutines and channels. Return a map of URL → response body (or error string).', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['go', 'goroutines', 'channels'], config: { language: 'go', starterCode: 'package main\n\nimport "net/http"\n\nfunc fetchAll(urls []string) map[string]string {\n    // your code here\n    return nil\n}', testCases: [] } },
        { type: 'SHORT_ANSWER', title: 'Go Error Handling Patterns', body: 'How does Go handle errors differently from exceptions in Java/Python? What are the best practices for wrapping and propagating errors in Go 1.13+?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['go', 'error-handling'], config: {} },
      ]},
      { title: 'Go Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'HTTP Middleware Chain', body: 'Write two Go HTTP middleware functions: (1) `WithLogging` that logs method, path, and request duration to stdout; (2) `WithRateLimit(rps int)` that enforces a per-IP token-bucket rate limit. Both should wrap an `http.Handler` and return an `http.Handler`.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['go', 'http', 'middleware'], config: { language: 'go', starterCode: 'package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"sync"\n\t"time"\n)\n\nfunc WithLogging(next http.Handler) http.Handler {\n\t// log: method, path, duration\n\treturn nil\n}\n\nfunc WithRateLimit(rps int, next http.Handler) http.Handler {\n\t// max rps requests per IP per second (token bucket)\n\treturn nil\n}', testCases: [] } },
        { type: 'DEBUGGING_CHALLENGE', title: 'Fix the Data Race', body: 'The counter below has a data race detected by `go test -race`. Fix it without changing the function signature — use `sync/atomic` or a `sync.Mutex`.\n\n```go\nvar counter int\n\nfunc incrementAll(n int) {\n    var wg sync.WaitGroup\n    for i := 0; i < n; i++ {\n        wg.Add(1)\n        go func() { defer wg.Done(); counter++ }()\n    }\n    wg.Wait()\n}\n```', points: 15, difficulty: 'medium', evaluator: 'code', skillTags: ['go', 'concurrency', 'race-condition'], config: { language: 'go', starterCode: 'package main\n\nimport "sync"\n\nvar counter int\n\nfunc incrementAll(n int) {\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < n; i++ {\n\t\twg.Add(1)\n\t\tgo func() { defer wg.Done(); counter++ }()\n\t}\n\twg.Wait()\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Python / Django Developer Assessment',
    description: 'Tests Python proficiency, Django ORM, REST APIs, async, and Pythonic coding.',
    roleType: 'python-developer', instructions: 'Answer all questions. Code should be Python 3.10+.',
    timeLimit: 60, passingScore: 70, templateSlug: 'python-developer-starter',
    sections: [
      { title: 'Python Fundamentals', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Python GIL', body: 'What does the Python GIL (Global Interpreter Lock) prevent?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['python', 'concurrency', 'gil'], config: { options: [{ label: 'Two Python processes running simultaneously', value: 'A' }, { label: 'Multiple Python threads executing Python bytecode simultaneously', value: 'B' }, { label: 'Python code from importing C extensions', value: 'C' }, { label: 'Circular imports between modules', value: 'D' }], correct: 'B', explanation: 'The GIL ensures only one thread executes Python bytecode at a time, limiting CPU-bound multithreading.' } },
        { type: 'CODING_CHALLENGE', title: 'Python Decorators', body: 'Write a Python decorator `@retry(max_attempts=3, delay=1)` that retries a function up to `max_attempts` times on any exception, waiting `delay` seconds between attempts. Raise the last exception if all attempts fail.', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['python', 'decorators', 'error-handling'], config: { language: 'python', starterCode: 'import time\nfrom functools import wraps\n\ndef retry(max_attempts=3, delay=1):\n    # your code here\n    pass', testCases: [] } },
      ]},
      { title: 'Django & REST APIs', questions: [
        { type: 'SHORT_ANSWER', title: 'Django ORM N+1', body: 'Explain the N+1 query problem in Django. Give a concrete example and show how to fix it using Django ORM methods.', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['django', 'orm', 'performance'], config: {} },
        { type: 'SCENARIO', title: 'Django REST API Design', body: 'Design a Django REST Framework API for a blog platform with Posts, Comments, and Users. Include serializer design, viewsets, permissions, and pagination strategy.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['django', 'drf', 'api-design'], config: { rubric: [{ criterion: 'Correct serializer nesting and read/write separation', maxPoints: 7, guidance: '' }, { criterion: 'ViewSets with appropriate actions', maxPoints: 6, guidance: '' }, { criterion: 'Permission classes (IsAuthenticated, IsOwnerOrReadOnly)', maxPoints: 6, guidance: '' }, { criterion: 'Pagination and filtering', maxPoints: 6, guidance: '' }] } },
      ]},
      { title: 'Python Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Async Rate-Limited HTTP Fetcher', body: 'Write an async Python function `fetch_all(urls, max_concurrent=5)` using `aiohttp` and `asyncio.Semaphore` to cap concurrent requests. Return a list of `(url, status_code, text)` tuples. Handle network errors gracefully — return `(url, 0, error_message)` on failure.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['python', 'async', 'aiohttp'], config: { language: 'python', starterCode: 'import asyncio\nimport aiohttp\nfrom typing import List, Tuple\n\nasync def fetch_all(\n    urls: List[str],\n    max_concurrent: int = 5,\n) -> List[Tuple[str, int, str]]:\n    """Fetch all URLs concurrently, limited to max_concurrent at once."""\n    # your code here\n    pass', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'PHP / Laravel Developer Assessment',
    description: 'Tests PHP 8, Laravel, Eloquent ORM, queues, and API development.',
    roleType: 'php-laravel-developer', instructions: 'Answer all questions. Code should be PHP 8+ / Laravel 10+.',
    timeLimit: 60, passingScore: 70, templateSlug: 'php-laravel-starter',
    sections: [
      { title: 'PHP & Laravel Core', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Laravel Service Container', body: 'What is the primary purpose of the Laravel Service Container?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['laravel', 'di', 'service-container'], config: { options: [{ label: 'Managing database connections', value: 'A' }, { label: 'Dependency injection and class resolution', value: 'B' }, { label: 'Routing HTTP requests', value: 'C' }, { label: 'Caching query results', value: 'D' }], correct: 'B', explanation: 'The Service Container resolves class dependencies and manages bindings for dependency injection.' } },
        { type: 'SHORT_ANSWER', title: 'Laravel Queues & Jobs', body: 'Explain how Laravel queues work. When would you use a queued job versus a synchronous operation? How do you handle failed jobs?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['laravel', 'queues', 'jobs'], config: {} },
        { type: 'CODING_CHALLENGE', title: 'Eloquent Relationships', body: 'A User has many Orders, and each Order has many Products (many-to-many via order_items). Write an Eloquent query to fetch all users who placed more than 5 orders in the last 30 days, eager-loading their orders and total spend.', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['laravel', 'eloquent', 'database'], config: { language: 'php', starterCode: '<?php\n// Write your Eloquent query here\n$users = User::query()\n    // ...\n    ->get();', testCases: [] } },
      ]},
      { title: 'Laravel Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Repository with Redis Cache', body: 'Implement a `UserRepository` in Laravel that: (1) fetches a user by ID from the database and caches the result in Redis for 5 minutes; (2) on `update()`, saves to the DB and invalidates the cached entry; (3) on `delete()`, removes the record and its cache key.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['laravel', 'repository', 'cache', 'redis'], config: { language: 'php', starterCode: '<?php\n\nuse Illuminate\\Support\\Facades\\Cache;\nuse App\\Models\\User;\n\nclass UserRepository\n{\n    public function findById(int $id): ?User\n    {\n        // cache key: "user:{$id}"\n    }\n\n    public function update(int $id, array $data): User\n    {\n        // update DB + invalidate cache\n    }\n\n    public function delete(int $id): void\n    {\n        // delete from DB + remove cache\n    }\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'iOS / Swift Developer Assessment',
    description: 'Tests Swift fundamentals, UIKit/SwiftUI, Combine, and iOS architecture patterns.',
    roleType: 'ios-developer', instructions: 'Answer all questions. Code should be Swift 5.9+.',
    timeLimit: 60, passingScore: 70, templateSlug: 'ios-developer-starter',
    sections: [
      { title: 'Swift & iOS Core', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Swift Memory Management', body: 'What causes a retain cycle in Swift?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['swift', 'arc', 'memory'], config: { options: [{ label: 'Using value types (structs)', value: 'A' }, { label: 'Two objects holding strong references to each other', value: 'B' }, { label: 'Using optional chaining', value: 'C' }, { label: 'Allocating large arrays', value: 'D' }], correct: 'B', explanation: 'A retain cycle occurs when two objects hold strong references to each other, preventing ARC from deallocating either.' } },
        { type: 'SHORT_ANSWER', title: 'SwiftUI vs UIKit', body: 'Compare SwiftUI and UIKit. When would you choose UIKit over SwiftUI in a new iOS project in 2024?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['swiftui', 'uikit', 'ios'], config: {} },
        { type: 'SCENARIO', title: 'iOS App Architecture', body: 'Design the architecture for an iOS news app that fetches articles from a REST API, caches them for offline use, and displays them in a paginated list. What patterns and frameworks would you use?', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['ios', 'architecture', 'mvvm'], config: { rubric: [{ criterion: 'Architecture pattern (MVVM, Clean, etc.)', maxPoints: 7, guidance: '' }, { criterion: 'Networking layer with async/await or Combine', maxPoints: 6, guidance: '' }, { criterion: 'Offline caching strategy (Core Data / URLCache)', maxPoints: 6, guidance: '' }, { criterion: 'UI layer — SwiftUI or UIKit with pagination', maxPoints: 6, guidance: '' }] } },
      ]},
      { title: 'Swift Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Generic async/await Network Client', body: 'Write a Swift `fetch<T: Decodable>(_ url: URL) async throws -> T` function that: makes a URLSession data task, decodes the JSON response into a Decodable type, maps HTTP 4xx/5xx responses to a `NetworkError.httpError(Int)` case, and retries the request once on `.networkFailure`.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['swift', 'networking', 'async-await', 'generics'], config: { language: 'swift', starterCode: 'import Foundation\n\nenum NetworkError: Error {\n    case httpError(Int)\n    case decodingFailed(Error)\n    case networkFailure(Error)\n}\n\nfunc fetch<T: Decodable>(_ url: URL) async throws -> T {\n    // your code here\n}', testCases: [] } },
        { type: 'CODING_CHALLENGE', title: 'Thread-Safe Cache Using Actor', body: 'Implement a generic thread-safe in-memory cache using Swift\'s `actor` model. Support: `get(_ key:) -> Value?` (returns nil if expired), `set(_ key:, value:, ttl: TimeInterval?)` (optional TTL), and `invalidate(_ key:)`. Entries with TTL should not be returned after expiry.', points: 25, difficulty: 'hard', evaluator: 'code', skillTags: ['swift', 'actor', 'concurrency', 'generics'], config: { language: 'swift', starterCode: 'import Foundation\n\nactor Cache<Key: Hashable, Value> {\n    private struct Entry {\n        let value: Value\n        let expiresAt: Date?\n    }\n    private var storage: [Key: Entry] = [:]\n\n    func get(_ key: Key) -> Value? {\n        // return nil if missing or expired\n    }\n\n    func set(_ key: Key, value: Value, ttl: TimeInterval? = nil) {\n        // store with optional expiry\n    }\n\n    func invalidate(_ key: Key) {\n        // remove entry\n    }\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Android / Kotlin Developer Assessment',
    description: 'Tests Kotlin, Jetpack Compose, Android architecture components, Coroutines, and Hilt.',
    roleType: 'android-developer', instructions: 'Answer all questions. Code should be Kotlin.',
    timeLimit: 60, passingScore: 70, templateSlug: 'android-developer-starter',
    sections: [
      { title: 'Kotlin & Android', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Coroutine Scope', body: 'Which coroutine scope should you use for operations that should survive screen rotation in an Android ViewModel?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['kotlin', 'coroutines', 'android'], config: { options: [{ label: 'GlobalScope', value: 'A' }, { label: 'lifecycleScope', value: 'B' }, { label: 'viewModelScope', value: 'C' }, { label: 'CoroutineScope(Dispatchers.IO)', value: 'D' }], correct: 'C', explanation: 'viewModelScope is tied to the ViewModel lifecycle and survives configuration changes like screen rotation.' } },
        { type: 'SHORT_ANSWER', title: 'Jetpack Compose Recomposition', body: 'Explain what triggers recomposition in Jetpack Compose. How do you prevent unnecessary recompositions and optimise performance?', points: 15, difficulty: 'hard', evaluator: 'manual', skillTags: ['compose', 'android', 'performance'], config: {} },
        { type: 'CODING_CHALLENGE', title: 'Flow + StateFlow', body: 'Write a Kotlin ViewModel that fetches a list of products from a repository, exposes them as a StateFlow, and handles loading/error/success states using a sealed class.', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['kotlin', 'flow', 'viewmodel'], config: { language: 'kotlin', starterCode: 'class ProductViewModel(private val repo: ProductRepository) : ViewModel() {\n    // your code here\n}', testCases: [] } },
      ]},
      { title: 'Android Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Room DAO with Complex Queries', body: 'Write a Room DAO for a `Task` entity (`id: Long, title: String, priority: Int, dueDate: LocalDate, completed: Boolean`). Include: (1) query for all incomplete tasks ordered by priority ASC then dueDate ASC; (2) query for tasks due within the next N days; (3) update query to mark all overdue tasks as completed.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['android', 'room', 'database', 'kotlin'], config: { language: 'kotlin', starterCode: 'import androidx.room.*\nimport java.time.LocalDate\n\n@Entity(tableName = "tasks")\ndata class Task(\n    @PrimaryKey val id: Long,\n    val title: String,\n    val priority: Int,\n    val dueDate: LocalDate,\n    val completed: Boolean\n)\n\n@Dao\ninterface TaskDao {\n    // implement the three queries here\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Vue.js Developer Assessment',
    description: 'Tests Vue 3 Composition API, Pinia, component design, and performance.',
    roleType: 'vue-developer', instructions: 'Answer all questions. Use Vue 3 Composition API syntax.',
    timeLimit: 60, passingScore: 70, templateSlug: 'vue-developer-starter',
    sections: [
      { title: 'Vue 3 & Composition API', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'ref vs reactive', body: 'In Vue 3, when would you prefer `ref()` over `reactive()` for state?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['vue', 'composition-api', 'reactivity'], config: { options: [{ label: 'For objects and arrays only', value: 'A' }, { label: 'For primitives (strings, numbers, booleans) or when you need to reassign the whole value', value: 'B' }, { label: 'ref and reactive are identical', value: 'C' }, { label: 'For computed properties only', value: 'D' }], correct: 'B', explanation: 'ref wraps any value (especially primitives) in a reactive object accessed via .value; reactive works best for plain objects.' } },
        { type: 'CODING_CHALLENGE', title: 'Custom Composable', body: 'Write a Vue 3 composable `useDebounce(value, delay)` that returns a debounced version of a reactive ref. It should debounce updates by `delay` ms.', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['vue', 'composables', 'reactivity'], config: { language: 'javascript', starterCode: 'import { ref, watch } from "vue";\n\nexport function useDebounce(value, delay = 300) {\n  // your code here\n}', testCases: [] } },
        { type: 'SHORT_ANSWER', title: 'Pinia vs Vuex', body: 'What are the main advantages of Pinia over Vuex 4 for state management in Vue 3 applications?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['vue', 'pinia', 'state-management'], config: {} },
      ]},
      { title: 'Vue Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Pinia Store with localStorage Persistence', body: 'Write a Pinia store (Composition API style) for a shopping cart that: tracks `items: CartItem[]` with `id`, `name`, `price`, `quantity`; exposes `totalPrice` and `itemCount` getters; has `addItem`, `removeItem`, and `clearCart` actions; and automatically persists + rehydrates state from `localStorage` via a `$subscribe` watcher.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['vue', 'pinia', 'state-management', 'localStorage'], config: { language: 'javascript', starterCode: 'import { defineStore } from "pinia";\nimport { ref, computed } from "vue";\n\nexport const useCartStore = defineStore("cart", () => {\n  // implement state, getters, actions + localStorage persistence\n});', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'GraphQL API Developer Assessment',
    description: 'Tests GraphQL schema design, resolvers, mutations, subscriptions, and performance.',
    roleType: 'graphql-developer', instructions: 'Answer all questions based on GraphQL best practices.',
    timeLimit: 60, passingScore: 70, templateSlug: 'graphql-developer-starter',
    sections: [
      { title: 'GraphQL Core', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'GraphQL N+1 Problem', body: 'What is the DataLoader pattern used for in GraphQL?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['graphql', 'performance', 'dataloader'], config: { options: [{ label: 'Lazy loading schema definitions', value: 'A' }, { label: 'Batching and caching database requests to prevent N+1 queries', value: 'B' }, { label: 'Streaming large query responses', value: 'C' }, { label: 'Validating query depth limits', value: 'D' }], correct: 'B', explanation: 'DataLoader batches all individual item lookups from a tick into a single bulk request, preventing N+1.' } },
        { type: 'SCENARIO', title: 'GraphQL Schema Design', body: 'Design a GraphQL schema for an e-commerce platform with Products, Categories, Users, and Orders. Include: types, queries, mutations, and at least one subscription. Consider pagination and filtering.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['graphql', 'schema-design', 'api'], config: { rubric: [{ criterion: 'Well-structured types with proper relationships', maxPoints: 7, guidance: '' }, { criterion: 'Queries with filtering and cursor-based pagination', maxPoints: 6, guidance: '' }, { criterion: 'Mutations with input types and error handling', maxPoints: 6, guidance: '' }, { criterion: 'Subscription for real-time order updates', maxPoints: 6, guidance: '' }] } },
        { type: 'SHORT_ANSWER', title: 'REST vs GraphQL Tradeoffs', body: 'When would you choose GraphQL over REST? What are the main drawbacks of GraphQL and how do you mitigate them?', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['graphql', 'rest', 'architecture'], config: {} },
      ]},
      { title: 'GraphQL Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'DataLoader for N+1 Prevention', body: 'Implement a DataLoader for a `comments` field on a Post type. The batch function receives an array of post IDs and must fetch all comments in a single `db.getCommentsByPostIds(ids)` call, then return them grouped by post ID (in the same order as the input IDs).', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['graphql', 'dataloader', 'performance', 'n+1'], config: { language: 'javascript', starterCode: 'const DataLoader = require("dataloader");\n\n// db.getCommentsByPostIds(ids: string[]) => Promise<{postId: string, id: string, text: string}[]>\n\nconst commentLoader = new DataLoader(async (postIds) => {\n  // batch-fetch, then return array in same order as postIds\n  // each element should be an array of comments for that postId\n});', testCases: [] } },
        { type: 'CODING_CHALLENGE', title: 'Cursor-Based Pagination', body: 'Implement a GraphQL resolver for `products(first: Int, after: String): ProductConnection`. The `after` argument is a base64-encoded product ID. Query the DB using `WHERE id > decodedCursor LIMIT first + 1`, determine `hasNextPage`, encode the last item ID as the `endCursor`, and return the Relay-spec Connection shape.', points: 25, difficulty: 'hard', evaluator: 'code', skillTags: ['graphql', 'pagination', 'relay', 'cursor'], config: { language: 'javascript', starterCode: '// Relay-spec ProductConnection resolver\nasync function products(_, { first = 10, after }, { db }) {\n  // decode cursor: Buffer.from(after, "base64").toString()\n  // encode cursor: Buffer.from(String(id)).toString("base64")\n  // return { edges: [{ node, cursor }], pageInfo: { hasNextPage, endCursor } }\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Full Stack Developer Assessment',
    description: 'Tests React, Node.js/Express, databases, REST API design, and deployment basics.',
    roleType: 'fullstack-developer', instructions: 'Answer all questions. Full stack — front and back end.',
    timeLimit: 75, passingScore: 70, templateSlug: 'fullstack-developer-starter',
    sections: [
      { title: 'Frontend (React)', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'React Reconciliation', body: 'What is the primary purpose of the `key` prop in React lists?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['react', 'performance', 'reconciliation'], config: { options: [{ label: 'To style list items uniquely', value: 'A' }, { label: 'To help React identify which items changed, were added, or removed', value: 'B' }, { label: 'To enable list item animations', value: 'C' }, { label: 'To sort list items automatically', value: 'D' }], correct: 'B', explanation: 'Keys help React\'s diffing algorithm identify which elements have changed for efficient re-rendering.' } },
        { type: 'CODING_CHALLENGE', title: 'Custom React Hook', body: 'Write a custom React hook `useFetch(url)` that fetches data from a URL, handles loading and error states, and re-fetches when the URL changes.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['react', 'hooks', 'fetch'], config: { language: 'javascript', starterCode: 'import { useState, useEffect } from "react";\n\nexport function useFetch(url) {\n  // return { data, loading, error }\n}', testCases: [] } },
      ]},
      { title: 'Backend (Node.js & Database)', questions: [
        { type: 'SHORT_ANSWER', title: 'JWT Authentication Flow', body: 'Describe the complete flow of JWT authentication: from user login to accessing a protected API endpoint. Include where tokens are stored and how they are validated.', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['auth', 'jwt', 'security'], config: {} },
        { type: 'SQL_CHALLENGE', title: 'SQL Aggregation', body: 'Given tables `orders(id, user_id, created_at, total)` and `users(id, name, email)`, write a SQL query to find the top 5 users by total spend in the last 90 days, including their name and total spend.', points: 20, difficulty: 'medium', evaluator: 'sql', skillTags: ['sql', 'aggregation', 'joins'], config: { schema: 'CREATE TABLE users (id INT, name VARCHAR, email VARCHAR);\nCREATE TABLE orders (id INT, user_id INT, created_at DATE, total DECIMAL);', expectedSql: 'SELECT u.name, SUM(o.total) as total_spend FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at >= NOW() - INTERVAL 90 DAY GROUP BY u.id, u.name ORDER BY total_spend DESC LIMIT 5' } },
      ]},
      { title: 'Full Stack Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'JWT Authentication Middleware', body: 'Write an Express middleware `authenticate(req, res, next)` that: extracts a Bearer token from the `Authorization` header; verifies it using `jsonwebtoken` with `JWT_SECRET`; attaches the decoded payload to `req.user`; and returns a `401 { error: "..." }` JSON response for missing, invalid, or expired tokens.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['node', 'jwt', 'auth', 'middleware'], config: { language: 'javascript', starterCode: 'const jwt = require("jsonwebtoken");\nconst { JWT_SECRET } = process.env;\n\n/**\n * Verifies Bearer JWT from Authorization header.\n * Attaches decoded payload to req.user on success.\n */\nfunction authenticate(req, res, next) {\n  // your code here\n}\n\nmodule.exports = { authenticate };', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Blockchain / Web3 Developer Assessment',
    description: 'Tests Solidity, smart contracts, Ethereum, DeFi protocols, and Web3.js/ethers.js.',
    roleType: 'blockchain-developer', instructions: 'Answer all questions. Solidity 0.8+ and Ethereum-focused.',
    timeLimit: 60, passingScore: 70, templateSlug: 'blockchain-developer-starter',
    sections: [
      { title: 'Smart Contracts & Solidity', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Reentrancy Attack', body: 'What is a reentrancy attack in Ethereum smart contracts?', points: 10, difficulty: 'hard', evaluator: 'multiple_choice', skillTags: ['solidity', 'security', 'reentrancy'], config: { options: [{ label: 'Calling the same function too many times per block', value: 'A' }, { label: 'An external contract recursively calling back into the vulnerable contract before state updates complete', value: 'B' }, { label: 'Front-running a transaction in the mempool', value: 'C' }, { label: 'Overflowing a uint256 variable', value: 'D' }], correct: 'B', explanation: 'Reentrancy exploits the fact that external calls happen before state changes, allowing recursive draining (e.g. The DAO hack).' } },
        { type: 'CODING_CHALLENGE', title: 'ERC-20 Token', body: 'Write a minimal ERC-20 token contract in Solidity with name, symbol, totalSupply, balanceOf, transfer, and approve/transferFrom. Include a constructor that mints the initial supply to the deployer.', points: 25, difficulty: 'hard', evaluator: 'code', skillTags: ['solidity', 'erc20', 'ethereum'], config: { language: 'solidity', starterCode: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract MyToken {\n    // your code here\n}', testCases: [] } },
        { type: 'SHORT_ANSWER', title: 'Gas Optimisation', body: 'List three specific Solidity patterns or techniques that reduce gas costs and explain why each one works.', points: 15, difficulty: 'hard', evaluator: 'manual', skillTags: ['solidity', 'gas', 'optimisation'], config: {} },
      ]},
      { title: 'Smart Contract Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Reentrancy-Safe ETH Escrow', body: 'Write a Solidity escrow contract where: (1) the buyer deposits ETH on deployment; (2) the buyer can call `release()` to send ETH to the seller; (3) the buyer can call `refund()` before release to get ETH back; (4) the contract uses checks-effects-interactions pattern and a `nonReentrant` guard to prevent reentrancy attacks.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['solidity', 'security', 'escrow', 'reentrancy'], config: { language: 'solidity', starterCode: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\ncontract Escrow {\n    address public immutable buyer;\n    address public immutable seller;\n    uint public immutable amount;\n    bool public released;\n    bool private _locked;\n\n    constructor(address _seller) payable {\n        buyer = msg.sender;\n        seller = _seller;\n        amount = msg.value;\n    }\n\n    // your code here\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Database Administrator (DBA) Assessment',
    description: 'Tests SQL, query optimisation, indexing, replication, backup strategies, and PostgreSQL/MySQL.',
    roleType: 'database-admin', instructions: 'Answer all questions. Queries may be PostgreSQL or MySQL.',
    timeLimit: 60, passingScore: 70, templateSlug: 'database-admin-starter',
    sections: [
      { title: 'SQL & Optimisation', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'Index Types', body: 'For a query that filters on a `status` column with only 3 distinct values from a 10M row table, which index would typically provide the least benefit?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['sql', 'indexing', 'performance'], config: { options: [{ label: 'B-tree index', value: 'A' }, { label: 'Partial index on status = "active"', value: 'B' }, { label: 'Composite index on (status, created_at)', value: 'C' }, { label: 'Standard B-tree index on a low-cardinality column alone', value: 'D' }], correct: 'D', explanation: 'A standard B-tree index on a low-cardinality column (3 values / 10M rows) rarely improves query plans as table scans may be faster.' } },
        { type: 'SQL_CHALLENGE', title: 'Query Optimisation', body: 'The following query runs in 30 seconds on a 50M-row orders table. Identify the issues and rewrite it:\n\n```sql\nSELECT * FROM orders WHERE YEAR(created_at) = 2024 AND status != "cancelled";\n```', points: 20, difficulty: 'hard', evaluator: 'sql', skillTags: ['sql', 'optimisation', 'indexing'], config: { schema: 'CREATE TABLE orders (id BIGINT, created_at DATETIME, status VARCHAR(20), total DECIMAL, user_id INT);', expectedSql: 'SELECT * FROM orders WHERE created_at >= "2024-01-01" AND created_at < "2025-01-01" AND status != "cancelled";' } },
        { type: 'SCENARIO', title: 'High Availability Strategy', body: 'Design a high-availability PostgreSQL setup for a SaaS application requiring 99.9% uptime and < 1 minute RTO. Describe replication topology, failover strategy, and backup approach.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['postgresql', 'replication', 'ha', 'backup'], config: { rubric: [{ criterion: 'Primary + standby replication setup (streaming / logical)', maxPoints: 7, guidance: '' }, { criterion: 'Automated failover tool (Patroni, repmgr, etc.)', maxPoints: 6, guidance: '' }, { criterion: 'Backup strategy (pg_dump, WAL archiving, PITR)', maxPoints: 6, guidance: '' }, { criterion: 'Connection pooling and load balancing (PgBouncer)', maxPoints: 6, guidance: '' }] } },
      ]},
      { title: 'Database Coding Challenges', questions: [
        { type: 'SQL_CHALLENGE', title: 'Recursive Org Chart CTE', body: 'Using `employees(id, name, manager_id)`, write a recursive CTE that returns each employee\'s `id`, `name`, `depth` (0 = CEO), and `path` string (e.g. `"CEO > VP Eng > Alice"`). Order by path.', points: 20, difficulty: 'medium', evaluator: 'sql', skillTags: ['sql', 'cte', 'recursive', 'postgresql'], config: { schema: 'CREATE TABLE employees (\n  id INT PRIMARY KEY,\n  name VARCHAR(100),\n  manager_id INT REFERENCES employees(id)\n);', expectedSql: 'WITH RECURSIVE chain AS (\n  SELECT id, name, manager_id, 0 AS depth, name::text AS path\n  FROM employees WHERE manager_id IS NULL\n  UNION ALL\n  SELECT e.id, e.name, e.manager_id, c.depth + 1, c.path || \' > \' || e.name\n  FROM employees e JOIN chain c ON e.manager_id = c.id\n)\nSELECT id, name, depth, path FROM chain ORDER BY path;' } },
        { type: 'CODING_CHALLENGE', title: 'PL/pgSQL Upsert Function', body: 'Write a PostgreSQL PL/pgSQL function `upsert_product(p_sku TEXT, p_name TEXT, p_price NUMERIC, p_stock INT) RETURNS INT` that inserts a new product or updates `name`, `price`, and `stock` if the SKU already exists (using `INSERT ... ON CONFLICT DO UPDATE`). Return the product\'s `id`.', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['postgresql', 'plpgsql', 'upsert'], config: { language: 'sql', starterCode: 'CREATE TABLE IF NOT EXISTS products (\n  id SERIAL PRIMARY KEY,\n  sku TEXT UNIQUE NOT NULL,\n  name TEXT,\n  price NUMERIC,\n  stock INT\n);\n\nCREATE OR REPLACE FUNCTION upsert_product(\n  p_sku   TEXT,\n  p_name  TEXT,\n  p_price NUMERIC,\n  p_stock INT\n) RETURNS INT AS $$\nBEGIN\n  -- your code here\nEND;\n$$ LANGUAGE plpgsql;', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'React Native / Mobile Developer Assessment',
    description: 'Tests React Native, cross-platform mobile development, navigation, and native modules.',
    roleType: 'react-native-developer', instructions: 'Answer all questions. React Native + Expo or bare workflow.',
    timeLimit: 60, passingScore: 70, templateSlug: 'react-native-developer-starter',
    sections: [
      { title: 'React Native Core', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'React Native Bridge', body: 'In React Native, what is the purpose of the JavaScript Bridge (or the new Architecture\'s JSI)?', points: 10, difficulty: 'medium', evaluator: 'multiple_choice', skillTags: ['react-native', 'architecture', 'bridge'], config: { options: [{ label: 'It converts JSX to native XML', value: 'A' }, { label: 'It enables communication between the JavaScript thread and the native UI thread', value: 'B' }, { label: 'It bundles JavaScript code for production', value: 'C' }, { label: 'It handles HTTP requests natively', value: 'D' }], correct: 'B', explanation: 'The Bridge (and JSI in the new architecture) enables async communication between JS and native code.' } },
        { type: 'SHORT_ANSWER', title: 'Performance Optimisation', body: 'List three common performance issues in React Native apps and how you would fix each one.', points: 15, difficulty: 'medium', evaluator: 'manual', skillTags: ['react-native', 'performance'], config: {} },
        { type: 'CODING_CHALLENGE', title: 'FlatList Optimisation', body: 'You have a FlatList displaying 10,000 items that is sluggish. Write an optimised FlatList implementation with proper key extraction, item layout, and memoisation to improve scroll performance.', points: 20, difficulty: 'hard', evaluator: 'code', skillTags: ['react-native', 'flatlist', 'performance'], config: { language: 'javascript', starterCode: 'import React, { memo } from "react";\nimport { FlatList, Text, View } from "react-native";\n\nconst ITEM_HEIGHT = 60;\n\n// Optimise this component\nexport function ProductList({ products }) {\n  return (\n    <FlatList\n      data={products}\n      renderItem={({ item }) => <View><Text>{item.name}</Text></View>}\n    />\n  );\n}', testCases: [] } },
      ]},
      { title: 'React Native Coding Challenges', questions: [
        { type: 'CODING_CHALLENGE', title: 'Auth Navigation Flow', body: 'Implement a React Navigation v6 root navigator that shows an `AuthStack` (Login + Signup) when the user is not logged in, and a `MainStack` (Home + Profile + Settings tabs) when authenticated. Use a React Context or Zustand store for auth state. Handle the case where auth state is loading (show a splash screen).', points: 20, difficulty: 'medium', evaluator: 'code', skillTags: ['react-native', 'navigation', 'auth', 'context'], config: { language: 'javascript', starterCode: 'import React from "react";\nimport { NavigationContainer } from "@react-navigation/native";\nimport { createNativeStackNavigator } from "@react-navigation/native-stack";\nimport { useAuth } from "./AuthContext"; // provides: { user, isLoading }\n\nconst Stack = createNativeStackNavigator();\n\nexport function AppNavigator() {\n  // render correct stack based on auth state\n  return null;\n}', testCases: [] } },
      ]},
    ],
  });

  await createAssessment(admin.id, {
    title: 'Business Analyst (Technical) Assessment',
    description: 'Tests requirements gathering, process modelling, SQL for data analysis, and stakeholder communication.',
    roleType: 'business-analyst', instructions: 'Answer all questions based on your BA experience.',
    timeLimit: 60, passingScore: 70, templateSlug: 'business-analyst-starter',
    sections: [
      { title: 'Requirements & Analysis', questions: [
        { type: 'MULTIPLE_CHOICE', title: 'User Story Format', body: 'Which of the following best describes the correct format of a User Story?', points: 10, difficulty: 'easy', evaluator: 'multiple_choice', skillTags: ['agile', 'user-stories', 'requirements'], config: { options: [{ label: 'The system shall allow users to log in with email and password', value: 'A' }, { label: 'As a registered user, I want to reset my password so that I can regain access to my account', value: 'B' }, { label: 'Login functionality for all users', value: 'C' }, { label: 'Implement OAuth2 login with Google and Facebook', value: 'D' }], correct: 'B', explanation: 'The standard User Story format is: As a [role], I want [goal] so that [benefit].' } },
        { type: 'SCENARIO', title: 'Requirements Gathering', body: 'You are the BA for a new expense management system. A stakeholder meeting reveals conflicting priorities between Finance (wants approval workflows) and HR (wants mobile-first). Describe how you would facilitate alignment, document requirements, and handle conflicts.', points: 25, difficulty: 'hard', evaluator: 'manual', skillTags: ['requirements', 'stakeholder-management', 'ba'], config: { rubric: [{ criterion: 'Stakeholder identification and engagement approach', maxPoints: 7, guidance: '' }, { criterion: 'Requirements elicitation techniques', maxPoints: 6, guidance: '' }, { criterion: 'Conflict resolution strategy', maxPoints: 6, guidance: '' }, { criterion: 'Documentation approach (BRD, user stories, acceptance criteria)', maxPoints: 6, guidance: '' }] } },
        { type: 'SQL_CHALLENGE', title: 'Data Analysis with SQL', body: 'Using the tables `sales(id, product_id, region, amount, sale_date)` and `products(id, name, category)`, write a query to show the month-over-month revenue growth percentage for each product category in 2024.', points: 20, difficulty: 'hard', evaluator: 'sql', skillTags: ['sql', 'data-analysis', 'business-intelligence'], config: { schema: 'CREATE TABLE products (id INT, name VARCHAR, category VARCHAR);\nCREATE TABLE sales (id INT, product_id INT, region VARCHAR, amount DECIMAL, sale_date DATE);', expectedSql: 'WITH monthly AS (SELECT DATE_FORMAT(sale_date, "%Y-%m") as month, p.category, SUM(amount) as revenue FROM sales s JOIN products p ON s.product_id = p.id WHERE YEAR(sale_date) = 2024 GROUP BY month, p.category) SELECT category, month, revenue, LAG(revenue) OVER (PARTITION BY category ORDER BY month) as prev_revenue, ROUND((revenue - LAG(revenue) OVER (PARTITION BY category ORDER BY month)) / LAG(revenue) OVER (PARTITION BY category ORDER BY month) * 100, 1) as growth_pct FROM monthly' } },
      ]},
      { title: 'Technical Coding Challenges', questions: [
        { type: 'SQL_CHALLENGE', title: 'Conversion Funnel Analysis', body: 'Using `user_events(user_id, event_name, created_at)` with events `page_view`, `add_to_cart`, `checkout_start`, `purchase_complete`, write a SQL query showing the count of distinct users and the conversion rate (%) at each funnel step for the last 30 days.', points: 20, difficulty: 'medium', evaluator: 'sql', skillTags: ['sql', 'funnel-analysis', 'business-intelligence'], config: { schema: 'CREATE TABLE user_events (\n  user_id INT,\n  event_name VARCHAR(50),\n  created_at TIMESTAMP\n);', expectedSql: 'WITH steps AS (\n  SELECT \'1_page_view\' AS step, COUNT(DISTINCT user_id) AS users FROM user_events WHERE event_name = \'page_view\' AND created_at >= NOW() - INTERVAL \'30 days\'\n  UNION ALL SELECT \'2_add_to_cart\', COUNT(DISTINCT user_id) FROM user_events WHERE event_name = \'add_to_cart\' AND created_at >= NOW() - INTERVAL \'30 days\'\n  UNION ALL SELECT \'3_checkout_start\', COUNT(DISTINCT user_id) FROM user_events WHERE event_name = \'checkout_start\' AND created_at >= NOW() - INTERVAL \'30 days\'\n  UNION ALL SELECT \'4_purchase_complete\', COUNT(DISTINCT user_id) FROM user_events WHERE event_name = \'purchase_complete\' AND created_at >= NOW() - INTERVAL \'30 days\'\n)\nSELECT step, users, ROUND(100.0 * users / NULLIF(LAG(users) OVER (ORDER BY step), 0), 1) AS conversion_pct FROM steps;' } },
      ]},
    ],
  });

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('── Demo Login Credentials ─────────────────────────────────');
  console.log('  Admin:     admin@skillio.io              / admin123');
  console.log('  Recruiter: recruiter@skillio.io          / recruiter123');
  console.log('  Recruiter: matt.gorman1@talentmsh.com    / MSH2026');
  console.log('  Recruiter: kurt.vosburgh1@talentmsh.com  / MSH_2026');
  console.log('  Recruiter: ballard.taleck@talentmsh.com  / MSH1_2026');
  console.log('  Recruiter: daryl.polydor@talentmsh.com   / MSh2026');
  console.log('  Recruiter: sami.adler@talentmsh.com      / msH2026');
  console.log('  Recruiter: oz.rashid@talentmsh.com       / MSH2026^');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  32 starter assessment templates created.');
  console.log('  Start the app: npm run dev → http://localhost:3000');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
