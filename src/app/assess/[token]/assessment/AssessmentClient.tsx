'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Monaco editor — client-side only, lazy loaded so it doesn't block the page
const MonacoEditor = dynamic(() => import('@/components/editors/CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-gray-300 bg-gray-900 h-[350px] flex items-center justify-center">
      <span className="text-gray-400 text-sm">Loading editor…</span>
    </div>
  ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestCase {
  input: string;
  expectedOutput: string;
  description?: string;
}

interface MCOption {
  label: string;
  value: string;
}

interface Question {
  id: string;
  type: string;
  title: string;
  body: string;
  points: number;
  timeLimitSec?: number;
  evaluator: string;
  config: Record<string, unknown>;
}

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

interface Assessment {
  id: string;
  title: string;
  timeLimit: number;
  monitoringEnabled: boolean;
  sections: Section[];
}

interface SavedResponse {
  questionId: string;
  answer: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssessmentClient({
  token,
  accessToken,
  attemptId,
}: {
  token: string;
  accessToken: string;
  attemptId: string;
}) {
  const router = useRouter();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt   = useRef<Date | null>(null);

  // ── Load assessment data ───────────────────────────────────────────────────

  useEffect(() => {
    if (!attemptId || !accessToken) {
      setLoadError('Missing session parameters. Please use your original invitation link.');
      setLoading(false);
      return;
    }

    fetch(`/api/candidate/attempt?attemptId=${attemptId}&t=${encodeURIComponent(accessToken)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoadError(data.error); setLoading(false); return; }

        setAssessment(data.assessment);
        startedAt.current = new Date(data.attempt.startedAt);

        // Restore saved answers
        const restored: Record<string, Record<string, unknown>> = {};
        for (const r of (data.responses as SavedResponse[]) || []) {
          restored[r.questionId] = r.answer as Record<string, unknown>;
        }
        setAnswers(restored);
        setSavedAnswers(restored);

        // Time remaining
        const elapsed = data.attempt.timeElapsed || 0;
        const totalSec = data.assessment.timeLimit * 60;
        setTimeLeft(Math.max(0, totalSec - elapsed));
        setLoading(false);
      })
      .catch(() => { setLoadError('Network error. Please refresh.'); setLoading(false); });
  }, [attemptId, accessToken]);

  // ── Countdown timer ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!assessment || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!assessment]);

  // ── Monitoring events ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!assessment?.monitoringEnabled || !attemptId) return;

    function send(type: string, metadata?: Record<string, unknown>) {
      fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          accessToken,
          eventType: type,
          metadata,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {/* monitoring failures are silent */});
    }

    const onHide  = () => send(document.visibilityState === 'hidden' ? 'page_hidden' : 'page_visible');
    const onBlur  = () => send('window_blur');
    const onFocus = () => send('window_focus');
    const onCopy  = () => send('copy');
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      send(text.length > 200 ? 'large_paste' : 'paste', { length: text.length });
    };
    const onCtx   = () => send('right_click');

    // Fullscreen exit
    const onFullscreen = () => {
      if (!document.fullscreenElement) send('fullscreen_exit');
    };

    // Network events
    const onOffline = () => send('network_disconnect');
    const onOnline  = () => send('network_reconnect');

    // Detect DevTools (heuristic: outer/inner window size delta)
    const devToolsInterval = setInterval(() => {
      const threshold = 160;
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        send('devtools_open');
      }
    }, 5000);

    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur',              onBlur);
    window.addEventListener('focus',             onFocus);
    document.addEventListener('copy',            onCopy);
    document.addEventListener('paste',           onPaste);
    document.addEventListener('contextmenu',     onCtx);
    document.addEventListener('fullscreenchange',onFullscreen);
    window.addEventListener('offline',           onOffline);
    window.addEventListener('online',            onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur',              onBlur);
      window.removeEventListener('focus',             onFocus);
      document.removeEventListener('copy',            onCopy);
      document.removeEventListener('paste',           onPaste);
      document.removeEventListener('contextmenu',     onCtx);
      document.removeEventListener('fullscreenchange',onFullscreen);
      window.removeEventListener('offline',           onOffline);
      window.removeEventListener('online',            onOnline);
      clearInterval(devToolsInterval);
    };
  }, [assessment?.monitoringEnabled, attemptId, accessToken]);

  // ── Autosave every 30s ─────────────────────────────────────────────────────

  const saveAnswer = useCallback(async (questionId: string, answer: Record<string, unknown>) => {
    if (!attemptId || !accessToken) return;
    setSaveStatus('saving');
    try {
      await fetch(`/api/candidate/response/${attemptId}?q=${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, answer }),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  }, [attemptId, accessToken]);

  useEffect(() => {
    autoSaveRef.current = setInterval(async () => {
      const unsaved = Object.entries(answers).filter(
        ([id, ans]) => JSON.stringify(ans) !== JSON.stringify(savedAnswers[id])
      );
      if (unsaved.length === 0) return;
      setSaveStatus('saving');
      await Promise.all(unsaved.map(([id, ans]) => saveAnswer(id, ans)));
      setSavedAnswers({ ...answers });
      setSaveStatus('saved');
    }, 30_000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [answers, savedAnswers, saveAnswer]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(confirmed = false) {
    if (submitting) return;
    if (!confirmed && !window.confirm('Submit your assessment? This cannot be undone.')) return;

    setSubmitting(true);

    // Save all unsaved answers first
    const allQ = assessment!.sections.flatMap((s) => s.questions);
    setSaveStatus('saving');
    await Promise.all(
      allQ
        .filter((q) => answers[q.id])
        .map((q) => saveAnswer(q.id, answers[q.id]))
    );
    setSavedAnswers({ ...answers });

    // Mark complete
    const res = await fetch(`/api/candidate/response/${attemptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    if (res.ok) {
      router.push(`/assess/${token}/complete?t=${accessToken}`);
    } else {
      setSubmitting(false);
      alert('Submission failed. Please try again.');
    }
  }

  function handleAutoSubmit() {
    // Time ran out — submit silently
    if (!submitting) handleSubmit(true);
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function navTo(si: number, qi: number) {
    setCurrentSection(si);
    setCurrentQuestion(qi);
  }

  function nextQuestion() {
    const sec = assessment!.sections[currentSection];
    if (currentQuestion < sec.questions.length - 1) navTo(currentSection, currentQuestion + 1);
    else if (currentSection < assessment!.sections.length - 1) navTo(currentSection + 1, 0);
  }

  function prevQuestion() {
    if (currentQuestion > 0) navTo(currentSection, currentQuestion - 1);
    else if (currentSection > 0) {
      const prev = assessment!.sections[currentSection - 1];
      navTo(currentSection - 1, prev.questions.length - 1);
    }
  }

  function setAnswer(qId: string, key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], [key]: value } }));
    setSaveStatus('unsaved');
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading assessment…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Could Not Load Assessment</h2>
          <p className="text-gray-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const allSections = assessment.sections;
  const section     = allSections[currentSection];
  const question    = section?.questions[currentQuestion];
  const allQ        = allSections.flatMap((s) => s.questions);
  const qIndex      = allSections.slice(0, currentSection)
    .reduce((n, s) => n + s.questions.length, 0) + currentQuestion;
  const total       = allQ.length;
  const answeredCnt = allQ.filter((q) => {
    const a = answers[q.id];
    return a && Object.values(a).some((v) => v !== '' && v != null);
  }).length;

  const minutes  = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds  = (timeLeft % 60).toString().padStart(2, '0');
  const isLow    = timeLeft < 300;
  const isFirst  = qIndex === 0;
  const isLast   = qIndex === total - 1;

  const SAVE_STATUS = {
    saved:   { label: 'Saved',   cls: 'text-green-600' },
    saving:  { label: 'Saving…', cls: 'text-gray-400'  },
    unsaved: { label: 'Unsaved', cls: 'text-orange-500' },
  }[saveStatus];

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-semibold text-gray-900 text-sm leading-tight">{assessment.title}</h1>
          <p className="text-xs text-gray-400">
            Question {qIndex + 1} of {total} ·{' '}
            <span className={SAVE_STATUS.cls}>{SAVE_STATUS.label}</span>
            {' · '}{answeredCnt}/{total} answered
          </p>
        </div>
        <div className="flex items-center gap-4">
          {assessment.monitoringEnabled && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full"
              title="Integrity monitoring is active. Tab switches, copy/paste, and other events are being logged.">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Monitored
            </div>
          )}
          <div className={`font-mono text-xl font-bold tabular-nums ${isLow ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
            {minutes}:{seconds}
          </div>
          <button
            className="btn-primary text-sm px-5"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </header>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      <div className="h-1 bg-gray-200 flex-shrink-0">
        <div
          className="h-full bg-brand-500 transition-all"
          style={{ width: `${(answeredCnt / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="w-52 bg-white border-r border-gray-200 overflow-y-auto p-3 flex-shrink-0">
          {allSections.map((sec, si) => (
            <div key={sec.id} className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                {sec.title}
              </p>
              <div className="space-y-0.5">
                {sec.questions.map((q, qi) => {
                  const globalIdx = allSections.slice(0, si).reduce((n, s2) => n + s2.questions.length, 0) + qi;
                  const isActive  = si === currentSection && qi === currentQuestion;
                  const ans       = answers[q.id];
                  const isDone    = ans && Object.values(ans).some((v) => v !== '' && v != null);
                  return (
                    <button
                      key={q.id}
                      onClick={() => navTo(si, qi)}
                      title={q.title}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center gap-2 ${
                        isActive
                          ? 'bg-brand-100 text-brand-800 font-semibold'
                          : isDone
                            ? 'bg-green-50 text-green-800 hover:bg-green-100'
                            : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold
                        bg-gray-200 text-gray-600">
                        {isDone ? '✓' : globalIdx + 1}
                      </span>
                      <span className="truncate">{q.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* ── Question area ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-8">
          {question ? (
            <div className="max-w-3xl mx-auto">
              {/* Question header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="badge bg-gray-100 text-gray-600 text-xs">
                    {question.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-gray-400">{question.points} points</span>
                  {question.timeLimitSec && (
                    <span className="badge bg-orange-100 text-orange-600 text-xs">
                      {Math.floor(question.timeLimitSec / 60)}m limit
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{question.title}</h2>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap
                  prose prose-sm max-w-none">
                  {question.body}
                </div>
              </div>

              {/* Answer input */}
              <QuestionRenderer
                question={question}
                answer={answers[question.id] || {}}
                onAnswer={(key, value) => setAnswer(question.id, key, value)}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
                <button onClick={prevQuestion} disabled={isFirst} className="btn-secondary">
                  ← Previous
                </button>
                <span className="text-xs text-gray-400">{qIndex + 1} / {total}</span>
                {isLast ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleSubmit(false)}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Submit Assessment →'}
                  </button>
                ) : (
                  <button onClick={nextQuestion} className="btn-primary">Next →</button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center mt-20">Select a question from the sidebar.</p>
          )}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Question renderer — one component per question type
// ─────────────────────────────────────────────────────────────────────────────

function QuestionRenderer({
  question,
  answer,
  onAnswer,
}: {
  question: Question;
  answer: Record<string, unknown>;
  onAnswer: (key: string, value: unknown) => void;
}) {
  const { type, config } = question;

  // ── Multiple choice ───────────────────────────────────────────────────────
  if (type === 'MULTIPLE_CHOICE') {
    const opts = (config.options as MCOption[]) || [];
    return (
      <div className="space-y-2">
        {opts.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              answer.selected === opt.value
                ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              answer.selected === opt.value ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
            }`}>
              {answer.selected === opt.value && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <span className="text-sm text-gray-800">{opt.label}</span>
            <input
              type="radio"
              className="sr-only"
              name={question.id}
              value={opt.value}
              checked={answer.selected === opt.value}
              onChange={() => onAnswer('selected', opt.value)}
            />
          </label>
        ))}
      </div>
    );
  }

  // ── Multi-select ──────────────────────────────────────────────────────────
  if (type === 'MULTI_SELECT') {
    const opts     = (config.options as MCOption[]) || [];
    const selected = (answer.selected as string[]) || [];
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 mb-3">Select all that apply.</p>
        {opts.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                checked
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-400'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                checked ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
              }`}>
                {checked && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm text-gray-800">{opt.label}</span>
              <input
                type="checkbox"
                className="sr-only"
                value={opt.value}
                checked={checked}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt.value]
                    : selected.filter((v) => v !== opt.value);
                  onAnswer('selected', next);
                }}
              />
            </label>
          );
        })}
      </div>
    );
  }

  // ── Short answer ──────────────────────────────────────────────────────────
  if (type === 'SHORT_ANSWER') {
    return (
      <textarea
        className="input font-sans min-h-[120px] resize-y"
        rows={5}
        placeholder="Type your answer here…"
        value={(answer.text as string) || ''}
        onChange={(e) => onAnswer('text', e.target.value)}
      />
    );
  }

  // ── Long answer / scenario / architecture / enterprise scenario ────────────
  if (['LONG_ANSWER','SCENARIO','ARCHITECTURE','ENTERPRISE_SCENARIO'].includes(type)) {
    const rubric = (config.rubric as { criterion: string }[]) || [];
    return (
      <div className="space-y-4">
        {rubric.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 mb-1">Scoring criteria:</p>
            <ul className="text-xs text-blue-700 list-disc pl-4 space-y-0.5">
              {rubric.map((r, i) => <li key={i}>{r.criterion}</li>)}
            </ul>
          </div>
        )}
        <textarea
          className="input font-sans min-h-[240px] resize-y leading-relaxed"
          rows={12}
          placeholder="Write your detailed answer here…"
          value={(answer.text as string) || ''}
          onChange={(e) => onAnswer('text', e.target.value)}
        />
        <p className="text-xs text-gray-400 text-right">
          {((answer.text as string) || '').split(/\s+/).filter(Boolean).length} words
        </p>
      </div>
    );
  }

  // ── Coding challenge / debugging ──────────────────────────────────────────
  if (['CODING_CHALLENGE','DEBUGGING_CHALLENGE'].includes(type)) {
    const lang      = (config.language as string) || 'javascript';
    const starter   = (config.starterCode as string) || '';
    const testCases = (config.testCases as TestCase[]) || [];

    return (
      <div className="space-y-4">
        {testCases.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Visible test cases:</p>
            <div className="space-y-1">
              {testCases.map((tc, i) => (
                <div key={i} className="font-mono text-xs text-gray-600">
                  <span className="text-gray-400">Input:</span> {tc.input}
                  {' → '}
                  <span className="text-gray-400">Expected:</span> {tc.expectedOutput}
                  {tc.description && <span className="text-gray-400 ml-2">({tc.description})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        <MonacoEditor
          language={lang}
          value={(answer.code as string) ?? starter}
          height="380px"
          onChange={(v) => {
            onAnswer('code', v);
            onAnswer('language', lang);
          }}
        />
      </div>
    );
  }

  // ── SQL challenge ─────────────────────────────────────────────────────────
  if (type === 'SQL_CHALLENGE') {
    const schema = (config.schema as string) || '';
    return (
      <div className="space-y-4">
        {schema && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Database schema:</p>
            <pre className="text-xs bg-gray-900 text-emerald-400 p-3 rounded-lg overflow-auto max-h-48 font-mono leading-relaxed">
              {schema}
            </pre>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Write your SELECT query below:</p>
          <MonacoEditor
            language="sql"
            value={(answer.query as string) || 'SELECT '}
            height="200px"
            onChange={(v) => onAnswer('query', v)}
          />
        </div>
      </div>
    );
  }

  // ── File upload ───────────────────────────────────────────────────────────
  if (type === 'FILE_UPLOAD') {
    const accepted = (config.acceptedTypes as string) || '.pdf,.doc,.docx,.zip';
    const maxMB    = (config.maxSizeMB as number) || 10;
    const fileName = (answer.fileName as string) || '';

    return (
      <div className="space-y-3">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-brand-400 transition-colors">
          <div className="text-3xl mb-2">📎</div>
          <p className="text-sm text-gray-600 mb-1">Drag & drop your file here, or click to browse</p>
          <p className="text-xs text-gray-400">Accepted: {accepted} · Max: {maxMB}MB</p>
          {/* [MOCK] File upload UI is wired but backend storage requires MinIO/S3 configuration */}
          <label className="mt-4 inline-block cursor-pointer">
            <span className="btn-secondary text-sm">Choose File</span>
            <input
              type="file"
              className="sr-only"
              accept={accepted}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > maxMB * 1024 * 1024) {
                  alert(`File too large. Maximum size is ${maxMB}MB.`);
                  return;
                }
                // [MOCK] In production this uploads to S3 and stores the URL
                onAnswer('fileName', file.name);
                onAnswer('fileSize', file.size);
                onAnswer('fileMock', true);
              }}
            />
          </label>
        </div>
        {fileName && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <span>✓ Selected: {fileName}</span>
            <button
              className="ml-auto text-xs text-green-600 hover:underline"
              onClick={() => { onAnswer('fileName', ''); onAnswer('fileSize', 0); }}
            >
              Remove
            </button>
          </div>
        )}
        <p className="text-xs text-orange-600">
          ⚠️ File uploads require S3/MinIO storage to be configured. See SETUP.md for instructions.
        </p>
      </div>
    );
  }

  // ── Fallback (plain textarea) ─────────────────────────────────────────────
  return (
    <textarea
      className="input min-h-[160px] resize-y"
      rows={7}
      placeholder="Type your answer here…"
      value={(answer.text as string) || ''}
      onChange={(e) => onAnswer('text', e.target.value)}
    />
  );
}
