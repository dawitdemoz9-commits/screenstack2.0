import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AssessmentDetailClient from './AssessmentDetailClient';

export default async function AssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: { orderBy: { orderIndex: 'asc' } },
        },
      },
      _count: { select: { invites: true, attempts: true } },
    },
  });

  if (!assessment) notFound();

  // Compute total points
  const totalPoints = assessment.sections
    .flatMap((s) => s.questions)
    .reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/assessments" className="text-sm text-brand-600 hover:underline">
          ← Back to Assessments
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
            {assessment.isTemplate && (
              <span className="badge bg-amber-100 text-amber-700">Template</span>
            )}
          </div>
          {assessment.description && (
            <p className="text-gray-500">{assessment.description}</p>
          )}
          <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
            <span>{assessment.timeLimit} min total</span>
            <span>{assessment.passingScore}% to pass</span>
            <span>{totalPoints} total points</span>
            <span>{assessment._count.invites} invites sent</span>
            <span>{assessment._count.attempts} attempts</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/invites?assessment=${id}`} className="btn-primary">
            Invite Candidate
          </Link>
        </div>
      </div>

      <AssessmentDetailClient
        assessment={assessment as never}
        totalPoints={totalPoints}
      />
    </div>
  );
}
