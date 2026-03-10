/**
 * ScreenStack — Database Seed
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
  const assessment = await prisma.assessment.create({
    data: {
      title:        data.title,
      description:  data.description,
      roleType:     data.roleType,
      instructions: data.instructions,
      timeLimit:    data.timeLimit,
      passingScore: data.passingScore,
      isTemplate:   true,
      templateSlug: data.templateSlug,
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
  console.log('🌱 Seeding ScreenStack database…');

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12);
  const recruiterHash = await bcrypt.hash('recruiter123', 12);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@screenstack.io' },
    update: {},
    create: {
      email:        'admin@screenstack.io',
      name:         'Alex Admin',
      passwordHash: adminHash,
      role:         'ADMIN',
    },
  });

  await prisma.user.upsert({
    where:  { email: 'recruiter@screenstack.io' },
    update: {},
    create: {
      email:        'recruiter@screenstack.io',
      name:         'Rachel Recruiter',
      passwordHash: recruiterHash,
      role:         'RECRUITER',
    },
  });

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

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('── Demo Login Credentials ─────────────────────────────────');
  console.log('  Admin:     admin@screenstack.io     / admin123');
  console.log('  Recruiter: recruiter@screenstack.io / recruiter123');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  10 starter assessment templates created.');
  console.log('  Start the app: npm run dev → http://localhost:3000');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
