import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSuspicionLevel } from '@/lib/monitoring';
import { getScoreBand, SCORE_BAND_LABELS } from '@/types';
import ReportClient from './ReportClient';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate:  true,
      assessment: {
        include: {
          sections: {
            orderBy: { orderIndex: 'asc' },
            include: { questions: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      },
      responses:        { include: { question: true } },
      monitoringEvents: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!attempt) notFound();

  const pct = attempt.maxScore && attempt.maxScore > 0
    ? Math.round(((attempt.score ?? 0) / (attempt.maxScore ?? 1)) * 100)
    : null;

  const band = pct !== null ? getScoreBand(pct) : null;
  const bandInfo = band ? SCORE_BAND_LABELS[band] : null;
  const suspicion = getSuspicionLevel(attempt.suspicionScore);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/candidates" className="text-sm text-brand-600 hover:underline">
          ← Back to Candidates
        </Link>
      </div>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{attempt.candidate.name}</h1>
            <p className="text-gray-500">{attempt.candidate.email}</p>
            <p className="text-sm text-gray-400 mt-1">{attempt.assessment.title}</p>
          </div>
          <div className="text-right">
            {pct !== null && (
              <div>
                <div className="text-4xl font-bold text-gray-900">{pct}%</div>
                {bandInfo && (
                  <span className={`badge mt-1 ${
                    bandInfo.color === 'green' ? 'bg-green-100 text-green-700' :
                    bandInfo.color === 'blue'  ? 'bg-blue-100 text-blue-700'  :
                    bandInfo.color === 'yellow'? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {bandInfo.recommendation}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-medium">{attempt.status.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time Used</p>
            <p className="font-medium">
              {attempt.timeElapsed
                ? `${Math.floor(attempt.timeElapsed / 60)}m ${attempt.timeElapsed % 60}s`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Score</p>
            <p className="font-medium">
              {attempt.score?.toFixed(0) ?? '—'} / {attempt.maxScore?.toFixed(0) ?? '—'} pts
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Integrity Signal</p>
            <p className={`font-medium ${
              suspicion.color === 'green' ? 'text-green-600' :
              suspicion.color === 'yellow'? 'text-yellow-600':
              suspicion.color === 'orange'? 'text-orange-600':
              'text-red-600'
            }`}>
              {suspicion.label} ({attempt.suspicionScore.toFixed(0)})
            </p>
          </div>
        </div>
      </div>

      {/* Integrity warning */}
      {attempt.suspicionScore > 30 && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm font-medium text-orange-800">
            ⚠ Integrity signals detected ({attempt.flaggedEventCount} events). These are indicators only and do not confirm misconduct. Review the monitoring timeline and use your judgement.
          </p>
        </div>
      )}

      <ReportClient attempt={attempt as never} />
    </div>
  );
}
