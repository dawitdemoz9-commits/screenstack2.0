import { prisma } from '@/lib/db';
import Link from 'next/link';

const TYPE_COLORS: Record<string, string> = {
  MULTIPLE_CHOICE:    'bg-blue-100 text-blue-700',
  MULTI_SELECT:       'bg-cyan-100 text-cyan-700',
  SHORT_ANSWER:       'bg-gray-100 text-gray-700',
  LONG_ANSWER:        'bg-gray-100 text-gray-700',
  CODING_CHALLENGE:   'bg-purple-100 text-purple-700',
  SQL_CHALLENGE:      'bg-green-100 text-green-700',
  DEBUGGING_CHALLENGE:'bg-orange-100 text-orange-700',
  FILE_UPLOAD:        'bg-pink-100 text-pink-700',
  SCENARIO:           'bg-yellow-100 text-yellow-700',
  ARCHITECTURE:       'bg-red-100 text-red-700',
  ENTERPRISE_SCENARIO:'bg-indigo-100 text-indigo-700',
};

const DIFF_COLORS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard:   'bg-red-100 text-red-700',
};

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; platform?: string; difficulty?: string; q?: string }>;
}) {
  const sp         = await searchParams;
  const typeFilter = sp.type       || '';
  const platFilter = sp.platform   || '';
  const diffFilter = sp.difficulty || '';
  const query      = sp.q          || '';

  const questions = await prisma.question.findMany({
    where: {
      ...(typeFilter ? { type: typeFilter as never } : {}),
      ...(platFilter ? { platform: platFilter }     : {}),
      ...(diffFilter ? { difficulty: diffFilter }   : {}),
      ...(query
        ? { OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { body:  { contains: query, mode: 'insensitive' } },
          ]}
        : {}),
    },
    include: {
      section: {
        include: { assessment: { select: { title: true, roleType: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const platforms = await prisma.question.findMany({
    where: { platform: { not: null } },
    select: { platform: true },
    distinct: ['platform'],
  });

  const totalQuestions = await prisma.question.count();

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 mt-1">
            {totalQuestions} questions across all assessments.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6 flex gap-3 flex-wrap items-center">
        <form className="contents" method="GET">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search questions…"
            className="input w-64 text-sm"
          />
          <select name="type" defaultValue={typeFilter} className="input w-auto text-sm">
            <option value="">All Types</option>
            {Object.keys(TYPE_COLORS).map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select name="difficulty" defaultValue={diffFilter} className="input w-auto text-sm">
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          {platforms.length > 0 && (
            <select name="platform" defaultValue={platFilter} className="input w-auto text-sm">
              <option value="">All Platforms</option>
              {platforms.map((p) => (
                <option key={p.platform!} value={p.platform!}>
                  {p.platform!.charAt(0).toUpperCase() + p.platform!.slice(1)}
                </option>
              ))}
            </select>
          )}
          <button type="submit" className="btn-primary text-sm">Filter</button>
          <Link href="/admin/question-bank" className="btn-secondary text-sm">Clear</Link>
        </form>
        <span className="ml-auto text-xs text-gray-400">{questions.length} matching</span>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            No questions match your filters.
          </div>
        ) : (
          questions.map((q) => (
            <div key={q.id} className="card p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`badge text-xs ${TYPE_COLORS[q.type] || 'bg-gray-100 text-gray-600'}`}>
                      {q.type.replace(/_/g, ' ')}
                    </span>
                    <span className={`badge text-xs ${DIFF_COLORS[q.difficulty as keyof typeof DIFF_COLORS] || ''}`}>
                      {q.difficulty}
                    </span>
                    {q.platform && (
                      <span className="badge bg-slate-100 text-slate-600 text-xs capitalize">{q.platform}</span>
                    )}
                    {q.skillTags.slice(0, 4).map((t) => (
                      <span key={t} className="badge bg-brand-50 text-brand-700 text-xs">{t}</span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{q.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{q.body}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-gray-700">{q.points} pts</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {q.evaluator.replace(/_/g, ' ')}
                  </p>
                  <Link
                    href={`/admin/assessments/${q.section.assessmentId}`}
                    className="text-xs text-brand-600 hover:underline mt-1 block"
                  >
                    {q.section.assessment.title.length > 30
                      ? q.section.assessment.title.slice(0, 30) + '…'
                      : q.section.assessment.title}
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
