import { prisma } from '@/lib/db';
import Link from 'next/link';
import { getSuspicionLevel } from '@/lib/monitoring';
import { getScoreBand, SCORE_BAND_LABELS } from '@/types';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status || '';
  const roleFilter   = sp.role   || '';

  const attempts = await prisma.attempt.findMany({
    where: {
      status: statusFilter ? (statusFilter as never) : { in: ['COMPLETED', 'FLAGGED'] },
      ...(roleFilter ? { assessment: { roleType: roleFilter } } : {}),
    },
    include: {
      candidate:  { select: { name: true, email: true } },
      assessment: { select: { title: true, roleType: true, passingScore: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 100,
  });

  const roles = await prisma.assessment.findMany({
    where: { isActive: true },
    select: { roleType: true },
    distinct: ['roleType'],
    orderBy: { roleType: 'asc' },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Review completed assessments, scores, and monitoring data.</p>
        </div>
        <p className="text-sm text-gray-400">{attempts.length} record{attempts.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <form className="flex gap-3 flex-wrap">
          <select
            name="role"
            defaultValue={roleFilter}
            className="input w-auto text-sm"
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set('role', e.target.value);
              window.location.href = url.toString();
            }}
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.roleType} value={r.roleType}>
                {r.roleType.replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </form>
        <div className="flex gap-2">
          {['', 'COMPLETED', 'FLAGGED'].map((s) => (
            <Link
              key={s}
              href={`/admin/reports?status=${s}&role=${roleFilter}`}
              className={`btn-${statusFilter === s ? 'primary' : 'secondary'} text-sm`}
            >
              {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assessment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recommendation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Integrity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Completed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No completed assessments yet. Send invites to get started.
                  </td>
                </tr>
              ) : (
                attempts.map((a) => {
                  const pct     = a.maxScore && a.maxScore > 0
                    ? Math.round(((a.score ?? 0) / a.maxScore) * 100) : null;
                  const band    = pct !== null ? getScoreBand(pct) : null;
                  const bInfo   = band ? SCORE_BAND_LABELS[band] : null;
                  const susp    = getSuspicionLevel(a.suspicionScore);
                  const isFlagged = a.status === 'FLAGGED' || a.suspicionScore > 50;

                  return (
                    <tr key={a.id} className={`hover:bg-gray-50 ${isFlagged ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.candidate.name}</p>
                        <p className="text-xs text-gray-400">{a.candidate.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{a.assessment.title}</p>
                        <p className="text-xs text-gray-400">{a.assessment.roleType.replace(/-/g,' ')}</p>
                      </td>
                      <td className="px-4 py-3">
                        {pct !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{pct}%</span>
                            {bInfo && (
                              <span className={`badge text-xs ${
                                a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {a.passed ? 'Pass' : 'Fail'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {a.recommendation ? (
                          <span className={`badge text-xs ${
                            a.recommendation === 'strong_hire' ? 'bg-green-100 text-green-700' :
                            a.recommendation === 'hire'        ? 'bg-blue-100 text-blue-700'   :
                            a.recommendation === 'maybe'       ? 'bg-yellow-100 text-yellow-700':
                            'bg-red-100 text-red-700'
                          }`}>
                            {a.recommendation.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not reviewed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${
                          susp.color === 'green'  ? 'text-green-600'  :
                          susp.color === 'yellow' ? 'text-yellow-600' :
                          susp.color === 'orange' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {susp.label}
                          {a.suspicionScore > 0 && (
                            <span className="text-gray-400 font-normal ml-1">({a.suspicionScore.toFixed(0)})</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {a.completedAt
                          ? new Date(a.completedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/reports/${a.id}`}
                          className="text-xs text-brand-600 hover:text-brand-800 hover:underline whitespace-nowrap"
                        >
                          View Report →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
