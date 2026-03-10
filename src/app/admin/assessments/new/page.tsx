'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { value: 'react-developer',    label: 'React Developer'             },
  { value: 'backend-engineer',   label: 'Backend Engineer'            },
  { value: 'data-analyst',       label: 'Data Analyst'                },
  { value: 'data-engineer',      label: 'Data Engineer'               },
  { value: 'salesforce-developer', label: 'Salesforce Developer'      },
  { value: 'salesforce-admin',   label: 'Salesforce Admin'            },
  { value: 'servicenow-developer', label: 'ServiceNow Developer'      },
  { value: 'netsuite-developer', label: 'NetSuite Developer / Admin'  },
  { value: 'sap-consultant',     label: 'SAP Consultant'              },
  { value: 'workday-integration', label: 'Workday Integration Specialist' },
  { value: 'custom',             label: 'Custom Role'                 },
];

export default function NewAssessmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', roleType: '', instructions: '',
    timeLimit: 60, passingScore: 70,
    monitoringEnabled: false, requireCamera: false,
    requireMicrophone: false, requireScreen: false,
  });

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roleType) { setError('Please select a role type.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create'); return; }
      router.push(`/admin/assessments/${data.assessment.id}`);
    } catch {
      setError('Network error.');
    } finally { setLoading(false); }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/assessments" className="text-sm text-brand-600 hover:underline">
          ← Back to Assessments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New Assessment</h1>
        <p className="text-gray-500">Configure the basics. You can add questions after.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Info</h2>

          <div>
            <label className="label">Assessment Title *</label>
            <input className="input" required value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Senior React Developer Assessment" />
          </div>

          <div>
            <label className="label">Role Type *</label>
            <select className="input" required value={form.roleType}
              onChange={(e) => set('roleType', e.target.value)}>
              <option value="">Select a role…</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description shown to recruiter." />
          </div>

          <div>
            <label className="label">Candidate Instructions</label>
            <textarea className="input" rows={4} value={form.instructions}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="What will candidates see before they start? Include any rules, guidelines, or context." />
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Time Limit (minutes)</label>
              <input type="number" className="input" min={5} max={360}
                value={form.timeLimit} onChange={(e) => set('timeLimit', +e.target.value)} />
            </div>
            <div>
              <label className="label">Passing Score (%)</label>
              <input type="number" className="input" min={0} max={100}
                value={form.passingScore} onChange={(e) => set('passingScore', +e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Integrity Monitoring</h2>
          <p className="text-sm text-gray-500">
            These signals help you understand candidate behaviour. They are indicators, not proof of cheating.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-brand-600"
              checked={form.monitoringEnabled}
              onChange={(e) => set('monitoringEnabled', e.target.checked)} />
            <span className="text-sm font-medium">Enable monitoring events (tab switches, copy/paste, etc.)</span>
          </label>
          {form.monitoringEnabled && (
            <div className="pl-7 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-brand-600"
                  checked={form.requireCamera} onChange={(e) => set('requireCamera', e.target.checked)} />
                <span className="text-sm">Require camera access</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-brand-600"
                  checked={form.requireMicrophone} onChange={(e) => set('requireMicrophone', e.target.checked)} />
                <span className="text-sm">Require microphone access</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-brand-600"
                  checked={form.requireScreen} onChange={(e) => set('requireScreen', e.target.checked)} />
                <span className="text-sm">Require screen share</span>
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Assessment'}
          </button>
          <Link href="/admin/assessments" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
