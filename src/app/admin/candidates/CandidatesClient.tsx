'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Attempt {
  id: string; status: string; score: number | null; passed: boolean | null;
  suspicionScore: number;
}

interface ActiveInvite {
  id: string; accessToken: string | null; assessmentTitle: string;
}

interface Candidate {
  id: string; name: string; email: string;
  attempts: Attempt[];
  activeInvites: ActiveInvite[];
}

export default function CandidatesClient({ candidates }: { candidates: Candidate[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

  function copyLink(inviteId: string, token: string) {
    navigator.clipboard.writeText(`${APP_URL}/assess/${inviteId}?t=${token}`);
    setCopied(inviteId);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessments</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latest Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {candidates.length === 0 ? (
            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No candidates yet. Send an invite to get started.</td></tr>
          ) : candidates.map((c) => {
            const latest = c.attempts[0];
            return (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-900">{c.attempts.length}</span>
                  {c.attempts.length > 0 && (
                    <span className="text-gray-500 text-xs ml-2">
                      ({c.attempts.filter((a) => a.status === 'COMPLETED').length} completed)
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {latest?.status === 'COMPLETED' && latest.score != null ? (
                    <div className="flex items-center gap-2">
                      <span className={`badge ${latest.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {latest.score.toFixed(0)} pts {latest.passed ? '· Pass' : '· Fail'}
                      </span>
                      {latest.suspicionScore > 30 && (
                        <span className="badge bg-orange-100 text-orange-700">⚠ Flagged</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">
                      {latest ? latest.status.replace('_', ' ') : 'No attempts'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3 flex-wrap">
                    {c.activeInvites.map((inv) => inv.accessToken && (
                      <button
                        key={inv.id}
                        onClick={() => copyLink(inv.id, inv.accessToken!)}
                        className="text-xs text-brand-600 hover:underline"
                        title={`Copy link for: ${inv.assessmentTitle}`}
                      >
                        {copied === inv.id ? '✓ Copied' : 'Copy Link'}
                      </button>
                    ))}
                    {c.attempts.filter(a => a.status === 'COMPLETED').map((a) => (
                      <Link key={a.id} href={`/admin/reports/${a.id}`}
                        className="text-xs text-gray-500 hover:underline">
                        Report
                      </Link>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
