'use client';

import { useState } from 'react';

interface Question {
  id: string; type: string; title: string; body: string;
  points: number; difficulty: string; evaluator: string; skillTags: string[];
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
                    <div key={q.id} className="px-6 py-4 flex items-start gap-4">
                      <span className="text-sm font-medium text-gray-400 w-6 mt-0.5">{qi + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="badge bg-gray-100 text-gray-600 text-xs">
                            {QUESTION_TYPE_LABELS[q.type] || q.type}
                          </span>
                          <span className={`badge text-xs ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>
                            {q.difficulty}
                          </span>
                          {q.skillTags.slice(0, 3).map((tag) => (
                            <span key={tag} className="badge bg-brand-50 text-brand-700 text-xs">{tag}</span>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{q.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{q.body}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        {q.points} pts
                      </span>
                    </div>
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

  if (!open) {
    return (
      <button className="text-sm text-brand-600 hover:underline" onClick={() => setOpen(true)}>
        + Add Question
      </button>
    );
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
