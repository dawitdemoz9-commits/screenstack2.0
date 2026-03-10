import { prisma } from '@/lib/db';
import CandidatesClient from './CandidatesClient';

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    include: {
      attempts: {
        select: {
          id: true, status: true, score: true, passed: true,
          suspicionScore: true, completedAt: true,
          assessment: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      invites: {
        where: { status: { in: ['SENT', 'OPENED', 'PENDING', 'IN_PROGRESS'] } },
        select: {
          id: true, accessToken: true,
          assessment: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = candidates.map((c) => ({
    ...c,
    activeInvites: c.invites.map((inv) => ({
      id: inv.id,
      accessToken: inv.accessToken,
      assessmentTitle: inv.assessment.title,
    })),
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
        <p className="text-gray-500 mt-1">{candidates.length} candidates on record</p>
      </div>
      <CandidatesClient candidates={data} />
    </div>
  );
}
