'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Assessment { id: string; title: string; roleType: string }
interface Attempt { id: string; status: string; score: number | null; maxScore: number | null; passed: boolean | null; suspicionScore: number }
interface Invite {
  id: string; status: string; createdAt: string; expiresAt: string;
  candidate: { name: string; email: string };
  assessment: { title: string; roleType: string };
  attempt: Attempt | null;
  accessToken: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-gray-100 text-gray-600',
  SENT:        'bg-blue-100 text-blue-700',
  OPENED:      'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED:   'bg-green-100 text-green-700',
  EXPIRED:     'bg-red-100 text-red-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

export default function InvitesClient({
  assessments,
  initialInvites,
  defaultAssessment,
}: {
  assessments: Assessment[];
  initialInvites: Invite[];
  defaultAssessment?: string;
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    assessmentId:  defaultAssessment || '',
    candidateName: '',
    candidateEmail:'',
    message:       '',
    expiresInDays: 7,
  });
  const [generatedLink, setGeneratedLink] = useState('');

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send invite'); return; }
      setGeneratedLink(data.assessmentLink);
      setInvites([data.invite, ...invites]);
      setForm({ ...form, candidateName: '', candidateEmail: '', message: '' });
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  }

  function copyLink(link: string, id: string) {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="space-y-6">
      {/* Form toggle */}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : '+ Send New Invite'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Send Assessment Invite</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}
          {generatedLink && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">✓ Invite created! Share this link with the candidate:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-white border border-green-300 rounded px-2 py-1.5 flex-1 break-all">
                  {generatedLink}
                </code>
                <button
                  className="btn-secondary text-xs whitespace-nowrap"
                  onClick={() => copyLink(generatedLink, 'generated')}
                >
                  {copied === 'generated' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          <form onSubmit={sendInvite} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Assessment *</label>
              <select className="input" required value={form.assessmentId}
                onChange={(e) => set('assessmentId', e.target.value)}>
                <option value="">Select an assessment…</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Candidate Name *</label>
              <input className="input" required value={form.candidateName}
                onChange={(e) => set('candidateName', e.target.value)}
                placeholder="Jane Smith" />
            </div>
            <div>
              <label className="label">Candidate Email *</label>
              <input type="email" className="input" required value={form.candidateEmail}
                onChange={(e) => set('candidateEmail', e.target.value)}
                placeholder="jane@example.com" />
            </div>
            <div>
              <label className="label">Expires In (days)</label>
              <input type="number" className="input" min={1} max={30}
                value={form.expiresInDays} onChange={(e) => set('expiresInDays', +e.target.value)} />
            </div>
            <div>
              <label className="label">Personal Message (optional)</label>
              <input className="input" value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="Hi Jane, please complete this assessment…" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Creating invite…' : 'Create Invite & Copy Link'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invites table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invites.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No invites yet.</td></tr>
              ) : invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{inv.candidate.name}</p>
                    <p className="text-gray-500 text-xs">{inv.candidate.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{inv.assessment.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[inv.status] || ''}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.attempt?.score != null && inv.attempt.maxScore ? (
                      <span className={`badge ${inv.attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {Math.round((inv.attempt.score / inv.attempt.maxScore) * 100)}%
                        {' '}{inv.attempt.passed ? '· Pass' : '· Fail'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-brand-600 hover:underline"
                        onClick={() => {
                          const link = `${APP_URL}/assess/${inv.id}?t=${inv.accessToken}`;
                          copyLink(link, inv.id);
                        }}
                      >
                        {copied === inv.id ? '✓ Copied' : 'Copy Link'}
                      </button>
                      {inv.attempt && (
                        <Link href={`/admin/reports/${inv.attempt.id}`}
                          className="text-xs text-gray-500 hover:text-gray-900 hover:underline">
                          View Report
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
