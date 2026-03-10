'use client';

import { useState, useCallback, useEffect } from 'react';

interface Question {
  id: string; type: string; title: string; body: string;
  points: number; difficulty: string; evaluator: string; skillTags: string[];
  config: Record<string, unknown>;
}
interface Section {
  id: string; title: string; description?: string;
  orderIndex: number; questions: Question[];
}
interface Assessment { id: string; sections: Section[]; }

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE:    'Multiple Choice',
  MULTI_SELECT:       'Multi-Select',
  SHORT_ANSWER:       'Short Answer',
  LONG_ANSWER:        'Long Answer',
  CODING_CHALLENGE:   'Coding',
  SQL_CHALLENGE:      'SQL',
  DEBUGGING_CHALLENGE:'Debugging',
  FILE_UPLOAD:        'File Upload',
  SCENARIO:           'Scenario',
  ARCHITECTURE:       'Architecture',
  ENTERPRISE_SCENARIO:'Enterprise Scenario',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
};

const DIFFICULTY_CONFIG: Record<string, { label: string; bar: string; rank: string; rankLabel: string }> = {
  easy:   { label: 'Easy',   bar: 'bg-green-400',  rank: '●',   rankLabel: 'Foundational' },
  medium: { label: 'Medium', bar: 'bg-yellow-400', rank: '●●',  rankLabel: 'Professional' },
  hard:   { label: 'Hard',   bar: 'bg-red-400',    rank: '●●●', rankLabel: 'Advanced'     },
};

function DifficultyStatsBar({ sections }: { sections: Section[] }) {
  const allQ = sections.flatMap((s) => s.questions);
  const total = allQ.length;
  if (total === 0) return null;

  const counts: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  const pts:    Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  for (const q of allQ) {
    const d = q.difficulty?.toLowerCase() || 'medium';
    counts[d] = (counts[d] || 0) + 1;
    pts[d]    = (pts[d]    || 0) + q.points;
  }

  const codingTypes = new Set(['CODING_CHALLENGE','SQL_CHALLENGE','DEBUGGING_CHALLENGE']);
  const codingCount = allQ.filter((q) => codingTypes.has(q.type)).length;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Question Difficulty Breakdown</h3>
        <span className="text-xs text-gray-400">{total} questions · {codingCount} coding</span>
      </div>

      {/* Visual bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-4 gap-0.5">
        {(['easy','medium','hard'] as const).map((d) => {
          const pct = total > 0 ? (counts[d] / total) * 100 : 0;
          return pct > 0 ? (
            <div key={d} className={`${DIFFICULTY_CONFIG[d].bar} transition-all`} style={{ width: `${pct}%` }} title={`${d}: ${counts[d]}`} />
          ) : null;
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {(['easy','medium','hard'] as const).map((d) => (
          <div key={d} className={`rounded-lg p-3 ${DIFFICULTY_COLORS[d]} bg-opacity-60`}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-bold tracking-wide uppercase">{DIFFICULTY_CONFIG[d].label}</span>
              <span className="text-xs opacity-70">{DIFFICULTY_CONFIG[d].rank}</span>
            </div>
            <div className="text-lg font-bold">{counts[d]}</div>
            <div className="text-xs opacity-75">{pts[d]} pts · {DIFFICULTY_CONFIG[d].rankLabel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AssessmentDetailClient({
  assessment,
  totalPoints,
}: {
  assessment: Assessment;
  totalPoints: number;
}) {
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(
    assessment.sections[0]?.id || null
  );
  const [sections, setSections] = useState<Section[]>(assessment.sections);

  async function addSection() {
    if (!sectionTitle.trim()) return;
    const res = await fetch(`/api/admin/assessments/${assessment.id}/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: sectionTitle, orderIndex: sections.length }),
    });
    const data = await res.json();
    if (res.ok) {
      setSections([...sections, { ...data.section, questions: [] }]);
      setSectionTitle('');
      setAddingSection(false);
    }
  }

  return (
    <div className="space-y-4">
      <DifficultyStatsBar sections={sections} />
      {/* Sections */}
      {sections.map((section) => (
        <div key={section.id} className="card">
          <div
            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => setExpandedSection(
              expandedSection === section.id ? null : section.id
            )}
          >
            <div>
              <h3 className="font-semibold text-gray-900">{section.title}</h3>
              <p className="text-sm text-gray-500">{section.questions.length} questions</p>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                expandedSection === section.id ? 'rotate-180' : ''
              }`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {expandedSection === section.id && (
            <div className="border-t border-gray-200">
              {section.questions.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400 text-sm">
                  No questions yet. Add your first question below.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {section.questions.map((q, qi) => (
                    <QuestionRow
                      key={q.id}
                      q={q}
                      qi={qi}
                      onConfigSaved={(updated) => {
                        setSections(prev => prev.map(s =>
                          s.id === section.id
                            ? { ...s, questions: s.questions.map(sq => sq.id === q.id ? { ...sq, config: updated } : sq) }
                            : s
                        ));
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                <AddQuestionInline sectionId={section.id} onAdded={(q) => {
                  setSections(prev => prev.map(s =>
                    s.id === section.id
                      ? { ...s, questions: [...s.questions, q] }
                      : s
                  ));
                }} questionCount={section.questions.length} />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add section */}
      {addingSection ? (
        <div className="card p-4 flex gap-3">
          <input
            className="input flex-1"
            placeholder="Section title (e.g. 'Core JavaScript Fundamentals')"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSection()}
            autoFocus
          />
          <button className="btn-primary" onClick={addSection}>Add</button>
          <button className="btn-secondary" onClick={() => { setAddingSection(false); setSectionTitle(''); }}>Cancel</button>
        </div>
      ) : (
        <button
          className="btn-secondary w-full border-dashed"
          onClick={() => setAddingSection(true)}
        >
          + Add Section
        </button>
      )}

      <div className="text-sm text-gray-500 text-right">
        Total: <strong className="text-gray-900">{totalPoints} points</strong> across {sections.length} sections
      </div>
    </div>
  );
}

// ─── Question row ─────────────────────────────────────────────────────────────

function QuestionRow({ q, qi, onConfigSaved }: {
  q: Question;
  qi: number;
  onConfigSaved: (config: Record<string, unknown>) => void;
}) {
  const [editingConfig, setEditingConfig] = useState(false);
  const isMC = ['MULTIPLE_CHOICE', 'MULTI_SELECT'].includes(q.type);
  const hasOptions = isMC && Array.isArray((q.config as Record<string, unknown>)?.options) &&
    ((q.config as Record<string, unknown>).options as unknown[]).length > 0;

  return (
    <div className="px-6 py-4">
      <div className="flex items-start gap-4">
        <span className="text-sm font-medium text-gray-400 w-6 mt-0.5">{qi + 1}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-gray-100 text-gray-600 text-xs">
              {QUESTION_TYPE_LABELS[q.type] || q.type}
            </span>
            <span className={`badge text-xs font-semibold ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
              {DIFFICULTY_CONFIG[q.difficulty]?.rank || '●'} {q.difficulty}
            </span>
            {q.skillTags.slice(0, 3).map((tag) => (
              <span key={tag} className="badge bg-brand-50 text-brand-700 text-xs">{tag}</span>
            ))}
          </div>
          <p className="text-sm font-medium text-gray-900">{q.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{q.body}</p>
        </div>
        <div className="flex items-center gap-3">
          {isMC && (
            <button
              onClick={() => setEditingConfig(!editingConfig)}
              className={`text-xs px-2 py-1 rounded border ${hasOptions
                ? 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300'
                : 'border-amber-300 text-amber-600 hover:border-amber-400 bg-amber-50'}`}
              title={hasOptions ? 'Edit options' : 'Options missing — click to add'}
            >
              {hasOptions ? 'Edit options' : '⚠ Add options'}
            </button>
          )}
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            {q.points} pts
          </span>
        </div>
      </div>
      {editingConfig && (
        <div className="mt-3 ml-10">
          <EditConfigInline
            question={q}
            onSaved={(updated) => { onConfigSaved(updated); setEditingConfig(false); }}
            onClose={() => setEditingConfig(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Edit config inline ───────────────────────────────────────────────────────

function EditConfigInline({ question, onSaved, onClose }: {
  question: Question;
  onSaved: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const hasOptions = Array.isArray((question.config as Record<string, unknown>)?.options) &&
    ((question.config as Record<string, unknown>).options as unknown[]).length > 0;

  const placeholder = question.type === 'MULTIPLE_CHOICE'
    ? JSON.stringify({ options: [{ label: 'Option A', value: 'A' }, { label: 'Option B', value: 'B' }, { label: 'Option C', value: 'C' }, { label: 'Option D', value: 'D' }], correct: 'A', explanation: '' }, null, 2)
    : JSON.stringify({ options: [{ label: 'Option A', value: 'A' }, { label: 'Option B', value: 'B' }], correct: ['A'], explanation: '' }, null, 2);

  const [configJson, setConfigJson] = useState(hasOptions ? JSON.stringify(question.config, null, 2) : placeholder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(configJson); } catch { setError('Invalid JSON'); return; }
    setSaving(true); setError('');
    const res = await fetch(`/api/admin/questions/${question.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: parsed }),
    });
    if (res.ok) {
      onSaved(parsed);
    } else {
      setError('Failed to save');
    }
    setSaving(false);
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700">
          Edit answer options{' '}
          <span className="text-gray-400 font-normal">
            {question.type === 'MULTIPLE_CHOICE' ? '— { options: [{label, value}], correct: "value" }' : '— { options: [{label, value}], correct: ["v1","v2"] }'}
          </span>
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <textarea
        className="input text-xs font-mono w-full"
        rows={10}
        value={configJson}
        onChange={(e) => setConfigJson(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn-primary text-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Options'}
        </button>
        <button className="btn-secondary text-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Inline question adder ────────────────────────────────────────────────────

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE',    label: 'Multiple Choice',  evaluator: 'multiple_choice' },
  { value: 'MULTI_SELECT',       label: 'Multi-Select',     evaluator: 'multi_select'    },
  { value: 'SHORT_ANSWER',       label: 'Short Answer',     evaluator: 'manual'          },
  { value: 'LONG_ANSWER',        label: 'Long Answer',      evaluator: 'manual'          },
  { value: 'CODING_CHALLENGE',   label: 'Coding Challenge', evaluator: 'code'            },
  { value: 'SQL_CHALLENGE',      label: 'SQL Challenge',    evaluator: 'sql'             },
  { value: 'DEBUGGING_CHALLENGE','label': 'Debugging',      evaluator: 'code'            },
  { value: 'SCENARIO',           label: 'Scenario',         evaluator: 'manual'          },
  { value: 'ARCHITECTURE',       label: 'Architecture',     evaluator: 'manual'          },
  { value: 'ENTERPRISE_SCENARIO','label':'Enterprise Scenario', evaluator: 'manual'      },
];

function AddQuestionInline({
  sectionId,
  onAdded,
  questionCount,
}: {
  sectionId: string;
  onAdded: (q: Question) => void;
  questionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [config, setConfig] = useState('{}');
  const [saving, setSaving] = useState(false);

  const selectedType = QUESTION_TYPES.find((t) => t.value === type);

  async function save() {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    let parsedConfig = {};
    try { parsedConfig = JSON.parse(config); } catch { /* ignore */ }

    const res = await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionId,
        type,
        title,
        body,
        points,
        difficulty,
        orderIndex: questionCount,
        evaluator: selectedType?.evaluator || 'manual',
        config: parsedConfig,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.question);
      setTitle(''); setBody(''); setConfig('{}'); setOpen(false);
    }
    setSaving(false);
  }

  if (!open && !bankOpen) {
    return (
      <div className="flex gap-4">
        <button className="text-sm text-brand-600 hover:underline" onClick={() => setOpen(true)}>
          + Add Question
        </button>
        <button className="text-sm text-purple-600 hover:underline" onClick={() => setBankOpen(true)}>
          Browse Question Bank
        </button>
      </div>
    );
  }

  if (bankOpen) {
    return <QuestionBankPicker sectionId={sectionId} questionCount={questionCount} onAdded={(q) => { onAdded(q); setBankOpen(false); }} onClose={() => setBankOpen(false)} />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label text-xs">Question Type</label>
          <select className="input text-sm" value={type} onChange={(e) => setType(e.target.value)}>
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Points</label>
          <input type="number" className="input text-sm" value={points}
            onChange={(e) => setPoints(+e.target.value)} min={1} />
        </div>
        <div>
          <label className="label text-xs">Difficulty</label>
          <select className="input text-sm" value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label text-xs">Question Title</label>
        <input className="input text-sm" value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title for the question" />
      </div>
      <div>
        <label className="label text-xs">Question Body (Markdown supported)</label>
        <textarea className="input text-sm font-mono" rows={4} value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Full question text, code snippets, instructions…" />
      </div>
      {['MULTIPLE_CHOICE','MULTI_SELECT','CODING_CHALLENGE','SQL_CHALLENGE'].includes(type) && (
        <div>
          <label className="label text-xs">
            Config JSON{' '}
            <span className="text-gray-400 font-normal">
              {type === 'MULTIPLE_CHOICE' && '— { options: [{label, value}], correct: "value", explanation: "" }'}
              {type === 'MULTI_SELECT'    && '— { options: [{label, value}], correct: ["v1","v2"] }'}
              {type === 'CODING_CHALLENGE'&& '— { language: "python", starterCode: "", testCases: [] }'}
              {type === 'SQL_CHALLENGE'   && '— { schema: "CREATE TABLE...", expectedSql: "" }'}
            </span>
          </label>
          <textarea className="input text-xs font-mono" rows={5} value={config}
            onChange={(e) => setConfig(e.target.value)} />
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn-primary text-sm" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save Question'}
        </button>
        <button className="btn-secondary text-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Question Bank Picker ─────────────────────────────────────────────────────

interface BankQuestion {
  id: string; type: string; title: string; body: string; points: number;
  difficulty: string; evaluator: string; skillTags: string[];
  config: Record<string, unknown>;
  section: { assessment: { title: string; roleType: string } };
}

function QuestionBankPicker({ sectionId, questionCount, onAdded, onClose }: {
  sectionId: string;
  questionCount: number;
  onAdded: (q: Question) => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const fetchQuestions = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    const res = await fetch('/api/admin/questions?' + params);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuestions(''); }, [fetchQuestions]);

  async function importSelected() {
    setImporting(true);
    try {
      const toImport = questions.filter((q) => selected.has(q.id));
      let lastAdded: Question | null = null;
      for (let i = 0; i < toImport.length; i++) {
        const q = toImport[i];
        const res = await fetch('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId,
            type: q.type,
            title: q.title,
            body: q.body,
            points: q.points,
            difficulty: q.difficulty,
            evaluator: q.evaluator,
            skillTags: q.skillTags,
            orderIndex: questionCount + i,
            config: q.config ?? {},
          }),
        });
        if (res.ok) {
          const data = await res.json();
          lastAdded = data.question;
          onAdded(data.question);
        } else {
          const data = await res.json().catch(() => ({}));
          alert(`Failed to import "${q.title}": ${data.error || res.statusText}`);
          break;
        }
      }
      if (lastAdded) onClose();
    } catch {
      alert('Network error while importing questions. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Browse Question Bank</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100">
          <input
            className="input text-sm w-full"
            placeholder="Search questions…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchQuestions(e.target.value); }}
          />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : questions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No questions found</div>
          ) : questions.map((q) => (
            <label key={q.id} className="flex items-start gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 text-brand-600"
                checked={selected.has(q.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  e.target.checked ? next.add(q.id) : next.delete(q.id);
                  setSelected(next);
                }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="badge bg-gray-100 text-gray-600 text-xs">{QUESTION_TYPE_LABELS[q.type] || q.type}</span>
                  <span className={`badge text-xs ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span>
                  <span className="text-xs text-gray-400">{q.section.assessment.title}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{q.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{q.body}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">{q.points} pts</span>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-3">
            <button className="btn-secondary text-sm" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary text-sm"
              onClick={importSelected}
              disabled={selected.size === 0 || importing}
            >
              {importing ? 'Importing…' : `Import ${selected.size} Question${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
