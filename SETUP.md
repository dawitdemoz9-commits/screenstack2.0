# ScreenStack — Setup Guide

**For non-technical founders:** This guide walks you through getting ScreenStack running on your computer, step by step. No coding required.

---

## What You're Setting Up

ScreenStack is a web application with three parts:
1. **The app** (Next.js) — the website you and candidates visit
2. **The database** (PostgreSQL) — stores all your data
3. **File storage** (MinIO, optional) — for file upload questions

---

## Option A: Run Locally (Simplest — for testing)

### What you need first
- **Node.js v20+** — [download here](https://nodejs.org)
- **PostgreSQL v14+** — [download here](https://www.postgresql.org/download/)

### Step 1: Get the code

```bash
cd screenstack
```

### Step 2: Set up your environment

```bash
cp .env.example .env
```

Open `.env` in any text editor. The defaults work for local development. The only thing to change before going live is `JWT_SECRET` — replace it with a long random string.

### Step 3: Install everything

```bash
npm install
```

### Step 4: Set up the database

First, create a database in PostgreSQL:

```bash
# On Mac/Linux:
createdb screenstack
createuser screenstack
psql -c "ALTER USER screenstack WITH PASSWORD 'screenstack';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE screenstack TO screenstack;"

# On Windows: use pgAdmin (graphical tool) to create the database
```

Then push the schema and load the demo data:

```bash
npm run db:push     # Creates all tables
npm run db:seed     # Loads demo data (10 assessment templates + admin accounts)
```

### Step 5: Start the app

```bash
npm run dev
```

Open your browser: **http://localhost:3000**

---

## Option B: Run with Docker (One command — includes database)

### What you need first
- **Docker Desktop** — [download here](https://www.docker.com/products/docker-desktop/)

### Step 1: Start everything

```bash
docker compose up -d
```

Wait about 30 seconds for the database to start.

### Step 2: Load demo data

```bash
npm run db:seed
```

### Step 3: Open the app

**http://localhost:3000**

To stop everything: `docker compose down`

---

## Logging In

| Role      | Email                        | Password      |
|-----------|------------------------------|---------------|
| Admin     | admin@screenstack.io         | admin123      |
| Recruiter | recruiter@screenstack.io     | recruiter123  |

---

## How to Use ScreenStack

### As a Recruiter

**1. Browse the Templates**
Go to **Assessments → View Templates**. You'll find 10 pre-built assessments:
- React Developer
- Backend Engineer
- Data Analyst
- Data Engineer
- Salesforce Developer & Admin
- ServiceNow Developer
- NetSuite Developer/Admin
- SAP Consultant
- Workday Integration Specialist

**2. Create an Assessment**
Click **New Assessment**, fill in the title, choose the role type, set the time limit, and optionally enable monitoring. Then add sections and questions.

**3. Invite a Candidate**
Go to **Invites → Send New Invite**. Enter the candidate's name and email, choose an assessment, and click "Create Invite". A secure link is generated — copy it and send it to your candidate.

> In development mode, the link is printed to your terminal. In production with an email service configured, it would be emailed automatically.

**4. Track Progress**
The Invites page shows each candidate's status: Invited → Opened → In Progress → Completed.

**5. Review Results**
Go to **Candidates** and click "Report" next to any completed assessment. You'll see:
- Their score and pass/fail status
- Every answer with auto-scoring where applicable
- A monitoring timeline (if monitoring was enabled)
- A section to add your notes and recommendation

---

### As a Candidate

Candidates receive a secure link that looks like:
```
http://localhost:3000/assess/[invite-id]?t=[secure-token]
```

They go through:
1. **Identity confirmation** — enter their name and email
2. **Consent** — read and agree to the assessment terms
3. **Permissions** (if monitoring enabled) — grant camera/mic/screen access
4. **The assessment** — questions with a countdown timer, Monaco code editor for code questions
5. **Submission** — their answers are saved and marked as complete

---

## Assessment Question Types

| Type | Description | Auto-scored? |
|------|-------------|-------------|
| Multiple Choice | One correct answer | ✅ Yes |
| Multi-Select | Multiple correct answers | ✅ Yes (partial credit) |
| Short Answer | Brief text response | ❌ Manual review |
| Long Answer | Detailed response | ❌ Manual review |
| Coding Challenge | Code editor with test cases | ⚠️ Partial (mock) |
| SQL Challenge | SQL editor | ⚠️ Partial (heuristic) |
| Debugging Challenge | Fix broken code | ⚠️ Partial (mock) |
| Scenario | Real-world scenario response | ❌ Manual review |
| Architecture | System design question | ❌ Manual review |
| Enterprise Scenario | Platform-specific scenario | ❌ Manual review |

> **Note on code execution:** In the current MVP, code is evaluated using heuristics. For real test case execution, connect a [Judge0](https://github.com/judge0/judge0) instance and set `CODE_EXECUTION_MOCK=false` in your `.env`.

---

## Scoring Bands

| Score | Band | Recommendation |
|-------|------|----------------|
| 90–100% | Excellent | Strong Hire |
| 75–89% | Good | Hire |
| 60–74% | Average | Consider |
| Below 60% | Below Standard | No Hire |

---

## Integrity Monitoring

When monitoring is enabled, the system tracks these events:

| Event | Severity | Suspicion Points |
|-------|----------|-----------------|
| Page hidden (tab switch) | Medium | +5 |
| Window blur | Low | +2 |
| Copy | Low | +1 |
| Paste | Medium | +5 |
| Large paste (200+ chars) | High | +15 |
| Fullscreen exit | Medium | +5 |
| Permission denied | High | +10 |
| Network disconnect | Low | +2 |
| DevTools opened | High | +20 |

**Important:** These are signals, not proof. The recruiter review UI makes this very clear. A candidate switching windows to check their IDE setup is not cheating.

---

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | See .env |
| `JWT_SECRET` | **Change this before going live!** | dev-secret |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | http://localhost:3000 |
| `CODE_EXECUTION_MOCK` | Set to `false` to use real Judge0 | true |
| `EMAIL_MOCK` | Set to `false` to use real SMTP | true |
| `STORAGE_ENDPOINT` | MinIO/S3 endpoint | localhost:9000 |

---

## Adding Real Email

1. Set `EMAIL_MOCK=false` in `.env`
2. Fill in your SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
3. The invite API (`src/app/api/admin/invites/route.ts`) has a marked section where you add your email-sending code (using `nodemailer` or a service like Resend/SendGrid)

---

## Deploying to Production

**Recommended: Vercel + Neon (managed Postgres)**

1. Push your code to GitHub
2. Connect the repo to [Vercel](https://vercel.com)
3. Create a [Neon](https://neon.tech) database — free tier available
4. Add all environment variables in Vercel's dashboard
5. Run `npx prisma migrate deploy` and `npm run db:seed` once against your production database
6. Deploy!

**Or: Any VPS with Docker**

```bash
git clone your-repo
cd screenstack
cp .env.example .env
# edit .env with production values
docker compose up -d
docker compose exec app npm run db:seed
```

---

## Project Structure (for developers)

```
screenstack/
├── prisma/
│   ├── schema.prisma      # All database tables
│   └── seed.ts            # Demo data (10 role assessments)
├── src/
│   ├── app/
│   │   ├── (auth)/login/  # Login page
│   │   ├── admin/         # Recruiter dashboard (all pages)
│   │   ├── assess/[token] # Candidate assessment flow
│   │   └── api/           # All backend API routes
│   ├── components/
│   │   ├── admin/         # Admin UI components
│   │   └── editors/       # Monaco code/SQL editors
│   ├── lib/
│   │   ├── auth.ts        # JWT authentication
│   │   ├── db.ts          # Prisma database client
│   │   ├── monitoring.ts  # Integrity event logging
│   │   └── evaluators/    # Scoring plugins
│   └── types/index.ts     # Shared TypeScript types
├── docker-compose.yml      # Local dev with Docker
└── SETUP.md               # This file
```

---

## Support & Next Steps

**The app runs locally and is ready for you to test.** Here's what to do next:

1. ✅ **Login and browse** the 10 starter assessment templates
2. ✅ **Send yourself a test invite** using your own email
3. ✅ **Complete an assessment** as a candidate to see the experience
4. ✅ **Review the report** as a recruiter
5. 🔧 **Customise a template** — add your own questions
6. 🔧 **Set up real email** when you're ready to invite real candidates
7. 🔧 **Deploy to production** when ready

Questions? The code is heavily commented throughout to explain what each part does.
