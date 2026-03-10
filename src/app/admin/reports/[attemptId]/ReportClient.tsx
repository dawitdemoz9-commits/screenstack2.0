'use client';

import { useState, useCallback } from 'react';

interface MonitoringEvent {
  id: string; eventType: string; severity: string;
  timestamp: string; suspicionDelta: number; metadata: Record<string,unknown>;
}
interface Response {
  id: string; answer: Record<string,unknown>; isCorrect: boolean | null;
  score: number | null; maxScore: number; feedback: string | null;
  isManualScore: boolean;
  question: {
    id: string; type: string; title: string; body: string;
    points: number; evaluator: string;
  };
}
interface Attempt {
  id: string; recruiterNotes: string | null; recommendation: string | null;
  responses: Response[];
  monitoringEvents: MonitoringEvent[];
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW:      'text-gray-500',
  MEDIUM:   'text-yellow-600',
  HIGH:     'text-orange-600',
  CRITICAL: 'text-red-600',
};

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_hire', label: 'Strong Hire',   color: 'bg-green-100 text-green-700' },
  { value: 'hire',        label: 'Hire',           color: 'bg-blue-100 text-blue-700'  },
  { value: 'maybe',       label: 'Maybe',          color: 'bg-yellow-100 text-yellow-700' },
  { value: 'no_hire',     label: 'No Hire',        color: 'bg-red-100 text-red-700'    },
];

export default function ReportClient({ attempt }: { attempt: Attempt }) {
  const [activeTab, setActiveTab] = useState<'responses' | 'monitoring' | 'review'>('responses');
  const [notes, setNotes] = useState(attempt.recruiterNotes || '');
  const [recommendation, setRecommendation] = useState(attempt.recommendation || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const exportPdf = useCallback(() => {
    window.print();
  }, []);

  // Manual scoring state
  const [manualScores, setManualScores] = useState<Record<string, { score: string; feedback: string }>>({});

  async function saveReview() {
    setSaving(true);
    await fetch(`/api/admin/reports/${attempt.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recruiterNotes: notes, recommendation }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function scoreResponse(responseId: string) {
    const entry = manualScores[responseId];
    if (!entry) return;
    await fetch(`/api/admin/reports/${attempt.id}/score-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        responseId,
        score: parseFloat(entry.score) || 0,
        feedback: entry.feedback,
      }),
    });
  }

  const tabs = [
    { key: 'responses',  label: `Answers (${attempt.responses.length})` },
    { key: 'monitoring', label: `Monitoring (${attempt.monitoringEvents.length})` },
    { key: 'review',     label: 'Recruiter Review' },
  ];

  return (
    <div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print-show { display: block !important; }
        }
      `}</style>

      {/* Actions bar */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={exportPdf}
          className="btn-ghost text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 print:hidden">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as never)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div id="report-print-area">

      {/* Responses tab */}
      <div className={activeTab === 'responses' ? '' : 'hidden print:block'}>
        <h2 className="hidden print:block text-lg font-bold text-gray-900 mb-4">Answers</h2>
        <div className="space-y-4">
          {attempt.responses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No responses recorded.</p>
          ) : attempt.responses.map((r, i) => (
            <div key={r.id} className="card">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">{i + 1}</span>
                  <span className="font-medium text-gray-900 text-sm">{r.question.title}</span>
                  <span className="badge bg-gray-100 text-gray-600 text-xs">{r.question.type.replace(/_/g,' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  {r.isCorrect === true  && <span className="badge bg-green-100 text-green-700">Correct</span>}
                  {r.isCorrect === false && !r.isManualScore && <span className="badge bg-red-100 text-red-700">Incorrect</span>}
                  {r.isManualScore       && <span className="badge bg-yellow-100 text-yellow-700">Manual Review</span>}
                  <span className="text-sm font-medium">
                    {r.score?.toFixed(0) ?? '?'} / {r.maxScore} pts
                  </span>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs text-gray-500 mb-2">Question:</p>
                <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{r.question.body}</p>

                <p className="text-xs text-gray-500 mb-2">Candidate Answer:</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(r.answer, null, 2)}
                </div>

                {r.feedback && (
                  <div className="mt-3 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <span className="font-medium">Auto feedback: </span>{r.feedback}
                  </div>
                )}

                {/* Manual scoring */}
                {r.isManualScore && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Override Score</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder={`Score (0-${r.maxScore})`}
                        className="input w-32 text-sm"
                        value={manualScores[r.id]?.score || ''}
                        onChange={(e) => setManualScores((prev) => ({
                          ...prev, [r.id]: { ...prev[r.id], score: e.target.value }
                        }))}
                      />
                      <input
                        placeholder="Feedback to candidate"
                        className="input flex-1 text-sm"
                        value={manualScores[r.id]?.feedback || ''}
                        onChange={(e) => setManualScores((prev) => ({
                          ...prev, [r.id]: { ...prev[r.id], feedback: e.target.value }
                        }))}
                      />
                      <button className="btn-primary text-sm" onClick={() => scoreResponse(r.id)}>
                        Save Score
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monitoring tab */}
      <div className={`${activeTab === 'monitoring' ? '' : 'hidden print:block'} mt-8`}>
        <h2 className="hidden print:block text-lg font-bold text-gray-900 mb-4">Monitoring Timeline</h2>
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 print:hidden">
          <strong>Important:</strong> These events are integrity signals, not proof of misconduct. Common causes include accidental window switches, browser notifications, or network issues. Use your professional judgement.
        </div>

        {attempt.monitoringEvents.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No monitoring events recorded.</p>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Suspicion +</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempt.monitoringEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{ev.eventType}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium ${SEVERITY_COLORS[ev.severity]}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">
                      {ev.suspicionDelta > 0 ? `+${ev.suspicionDelta}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {ev.metadata && Object.keys(ev.metadata).length > 0
                        ? JSON.stringify(ev.metadata)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review tab */}
      <div className={`${activeTab === 'review' ? '' : 'hidden print:block'} mt-8`}>
        <div className="card p-6 space-y-6">
          <h3 className="font-semibold text-gray-900">Recruiter Review</h3>

          <div>
            <label className="label">Recommendation</label>
            <div className="flex gap-2 flex-wrap print:hidden">
              {RECOMMENDATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRecommendation(opt.value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                    recommendation === opt.value
                      ? `${opt.color} border-current`
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {recommendation && (
              <p className="hidden print:block text-sm font-medium">
                {RECOMMENDATION_OPTIONS.find((o) => o.value === recommendation)?.label ?? recommendation}
              </p>
            )}
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input print:hidden"
              rows={6}
              placeholder="Add your assessment notes, observations, and decision rationale here…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {notes && (
              <p className="hidden print:block text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
            )}
          </div>

          <button className="btn-primary print:hidden" onClick={saveReview} disabled={saving}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      </div>

      </div>{/* end report-print-area */}
    </div>
  );
}
