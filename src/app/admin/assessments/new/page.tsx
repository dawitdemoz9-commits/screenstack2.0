'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { value: 'react-developer',       label: 'React Developer'               },
  { value: 'backend-engineer',      label: 'Backend Engineer'              },
  { value: 'data-analyst',          label: 'Data Analyst'                  },
  { value: 'data-engineer',         label: 'Data Engineer'                 },
  { value: 'salesforce-developer',  label: 'Salesforce Developer'          },
  { value: 'salesforce-admin',      label: 'Salesforce Admin'              },
  { value: 'servicenow-developer',  label: 'ServiceNow Developer'          },
  { value: 'netsuite-developer',    label: 'NetSuite Developer / Admin'    },
  { value: 'sap-consultant',        label: 'SAP Consultant'                },
  { value: 'workday-integration',   label: 'Workday Integration Specialist'},
  { value: 'java-developer',        label: 'Java Developer'                },
  { value: 'dotnet-developer',      label: 'C# / .NET Developer'           },
  { value: 'azure-engineer',        label: 'Azure Engineer'                },
  { value: 'aws-engineer',          label: 'AWS Engineer'                  },
  { value: 'rails-developer',       label: 'Ruby on Rails Developer'       },
  { value: 'devops-engineer',       label: 'DevOps Engineer'               },
  { value: 'qa-engineer',           label: 'QA / Test Engineer'            },
  { value: 'network-security',      label: 'Network Security Engineer'     },
  { value: 'ml-engineer',           label: 'Machine Learning Engineer'     },
  { value: 'ai-llm-engineer',       label: 'LLM / AI Engineer'             },
  { value: 'custom',                label: 'Custom Role'                   },
];

type Mode = 'manual' | 'ai';

export default function NewAssessmentPage() {
  const [mode, setMode] = useState<Mode>('manual');

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/assessments" className="text-sm text-brand-600 hover:underline">
          Back to Assessments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New Assessment</h1>
        <p className="text-gray-500">Build manually or let Claude generate one from a job description.</p>
      </div>

      <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manual Setup
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${mode === 'ai' ? 'bg-white shadow text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span>✨</span> Generate from JD
        </button>
      </div>

      {mode === 'manual' ? <ManualForm roleOptions={ROLE_OPTIONS} /> : <AIGenerateForm />}
    </div>
  );
}

function ManualForm({ roleOptions }: { roleOptions: { value: string; label: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', roleType: '', instructions: '',
    timeLimit: 60, passingScore: 70,
    monitoringEnabled: false, requireCamera: false, requireMicrophone: false, requireScreen: false,
  });

  function set(field: string, value: unknown) { setForm((f) => ({ ...f, [field]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roleType) { setError('Please select a role type.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/assessments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create'); return; }
      router.push(`/admin/assessments/${data.assessment.id}`);
    } catch { setError('Network error.'); } finally { setLoading(false); }
  }

  return (
    <>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Info</h2>
          <div>
            <label className="label">Assessment Title *</label>
            <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Senior React Developer Assessment" />
          </div>
          <div>
            <label className="label">Role Type *</label>
            <select className="input" required value={form.roleType} onChange={(e) => set('roleType', e.target.value)}>
              <option value="">Select a role…</option>
              {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description shown to recruiter." />
          </div>
          <div>
            <label className="label">Candidate Instructions</label>
            <textarea className="input" rows={4} value={form.instructions} onChange={(e) => set('instructions', e.target.value)} placeholder="What will candidates see before they start?" />
          </div>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Time Limit (minutes)</label>
              <input type="number" className="input" min={5} max={360} value={form.timeLimit} onChange={(e) => set('timeLimit', +e.target.value)} />
            </div>
            <div>
              <label className="label">Passing Score (%)</label>
              <input type="number" className="input" min={0} max={100} value={form.passingScore} onChange={(e) => set('passingScore', +e.target.value)} />
            </div>
          </div>
        </div>
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Integrity Monitoring</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-brand-600" checked={form.monitoringEnabled} onChange={(e) => set('monitoringEnabled', e.target.checked)} />
            <span className="text-sm font-medium">Enable monitoring events (tab switches, copy/paste, etc.)</span>
          </label>
          {form.monitoringEnabled && (
            <div className="pl-7 space-y-2">
              {[['requireCamera','Require camera access'],['requireMicrophone','Require microphone'],['requireScreen','Require screen share']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-brand-600" checked={form[k as keyof typeof form] as boolean} onChange={(e) => set(k, e.target.checked)} />
                  <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create Assessment'}</button>
          <Link href="/admin/assessments" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}

function AIGenerateForm() {
  const router = useRouter();
  const [jd, setJd] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [timeLimit, setTimeLimit] = useState(60);
  const [passingScore, setPassingScore] = useState(70);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [steps, setSteps] = useState<{label:string;done:boolean}[]>([]);

  function pushStep(label: string) { setSteps((s) => [...s, { label, done: false }]); }
  function doneStep() { setSteps((s) => s.map((x,i) => i===s.length-1 ? {...x,done:true} : x)); }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (jd.trim().length < 50) { setError('Please paste a full job description (min 50 characters).'); return; }
    setLoading(true); setError(''); setSteps([]);

    try {
      pushStep('Analysing job description with Claude Opus…');
      const genRes = await fetch('/api/admin/assessments/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, numQuestions: +numQuestions, difficulty }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) { setError(genData.error || 'Generation failed.'); setLoading(false); return; }
      doneStep();

      const gen = genData.assessment;
      const totalQ = gen.sections?.reduce((n: number, s: {questions:unknown[]}) => n + s.questions.length, 0) ?? 0;

      pushStep('Creating assessment shell…');
      const createRes = await fetch('/api/admin/assessments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: gen.title, description: gen.description, roleType: gen.roleType || 'custom', instructions: `Generated by Claude AI from your job description.\n\n${gen.instructions || 'Answer all questions to the best of your ability.'}`, timeLimit: +timeLimit, passingScore: +passingScore }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) { setError(createData.error || 'Failed to create assessment.'); setLoading(false); return; }
      doneStep();

      pushStep(`Importing ${totalQ} questions across ${gen.sections?.length ?? 0} sections…`);
      const importRes = await fetch(`/api/admin/assessments/${createData.assessment.id}/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: gen.sections }),
      });
      if (!importRes.ok) { setError('Questions import failed. Assessment was created — add questions manually.'); setLoading(false); return; }
      doneStep();

      pushStep('Done! Opening assessment…');
      router.push(`/admin/assessments/${createData.assessment.id}`);
    } catch { setError('Network error. Please try again.'); setLoading(false); }
  }

  return (
    <>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {loading && steps.length > 0 && (
        <div className="mb-6 card p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Generating your assessment…</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done
                ? <span className="text-green-500 font-bold">✓</span>
                : <span className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin inline-block" />}
              <span className={`text-sm ${step.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{step.label}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={generate} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 text-xl">✨</div>
            <div>
              <h2 className="font-semibold text-gray-900">Paste Job Description</h2>
              <p className="text-sm text-gray-500 mt-0.5">Claude Opus will analyse the JD and generate targeted, skill-tested questions automatically.</p>
            </div>
          </div>
          <textarea
            className="input text-sm"
            rows={14}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            disabled={loading}
            placeholder={"Paste the full job description here…\n\nExample:\nWe're looking for a Senior React Developer with 5+ years of experience building complex SPAs. The ideal candidate is proficient in React hooks, TypeScript, performance optimisation, and has experience with REST APIs and state management (Redux or Zustand)…"}
          />
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Options</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Number of Questions</label>
              <input type="number" className="input" min={3} max={20} value={numQuestions} onChange={(e) => setNumQuestions(+e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={loading}>
                <option value="mixed">Mixed (easy / medium / hard)</option>
                <option value="easy">All Easy</option>
                <option value="medium">All Medium</option>
                <option value="hard">All Hard</option>
              </select>
            </div>
            <div>
              <label className="label">Time Limit (minutes)</label>
              <input type="number" className="input" min={10} max={180} value={timeLimit} onChange={(e) => setTimeLimit(+e.target.value)} disabled={loading} />
            </div>
            <div>
              <label className="label">Passing Score (%)</label>
              <input type="number" className="input" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(+e.target.value)} disabled={loading} />
            </div>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>Setup required:</strong> Add your API key to <code className="bg-amber-100 px-1 rounded">.env</code>:
          <code className="block mt-1 bg-amber-100 px-2 py-1 rounded font-mono">ANTHROPIC_API_KEY=sk-ant-...</code>
          Generation takes 15–30 seconds. All questions are editable after.
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</> : <>✨ Generate Assessment</>}
          </button>
          <Link href="/admin/assessments" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  );
}
