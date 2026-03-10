import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import InvitesClient from './InvitesClient';

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const sp = await searchParams;
  const user = await getAuthUser();

  const [assessments, invites] = await Promise.all([
    prisma.assessment.findMany({
      where: { isActive: true, isTemplate: false },
      select: { id: true, title: true, roleType: true },
      orderBy: { title: 'asc' },
    }),
    prisma.invite.findMany({
      where: {
        createdById: user?.role === 'ADMIN' ? undefined : user?.id,
        ...(sp.assessment ? { assessmentId: sp.assessment } : {}),
      },
      include: {
        candidate:  { select: { name: true, email: true } },
        assessment: { select: { title: true, roleType: true } },
        attempt: { select: { id: true, status: true, score: true, passed: true, suspicionScore: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Invites</h1>
        <p className="text-gray-500 mt-1">Send assessment links to candidates and track their progress.</p>
      </div>

      <InvitesClient
        assessments={assessments}
        initialInvites={invites as never}
        defaultAssessment={sp.assessment}
      />
    </div>
  );
}
