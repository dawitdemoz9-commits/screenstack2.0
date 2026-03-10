import { prisma } from '@/lib/db';
import { verifyInviteToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AssessLanding from './AssessLanding';

export default async function AssessPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const accessToken = sp.t || '';

  // Verify the signed JWT
  const tokenData = accessToken ? await verifyInviteToken(accessToken) : null;
  if (!tokenData || tokenData.inviteId !== token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-500">
            This assessment link is no longer valid. Please contact the recruiter who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  let invite;
  try {
    invite = await prisma.invite.findUnique({
      where: { id: token },
      include: {
        candidate:  true,
        assessment: {
          select: {
            id: true, title: true, description: true, roleType: true,
            timeLimit: true, passingScore: true, instructions: true,
            monitoringEnabled: true, requireCamera: true,
            requireMicrophone: true, requireScreen: true,
            sections: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true, title: true,
                _count: { select: { questions: true } },
              },
            },
          },
        },
        attempt: { select: { id: true, status: true } },
      },
    });
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Service Unavailable</h1>
          <p className="text-gray-500">
            Unable to load the assessment. Please try again in a moment.
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    redirect('/');
  }

  // Already completed — redirect to done page
  if (invite.attempt?.status === 'COMPLETED') {
    redirect(`/assess/${token}/complete?t=${accessToken}`);
  }

  // Already in progress — resume
  if (invite.attempt?.status === 'IN_PROGRESS') {
    redirect(`/assess/${token}/assessment?t=${accessToken}`);
  }

  const expired = invite.expiresAt < new Date();

  return (
    <AssessLanding
      invite={invite as never}
      accessToken={accessToken}
      expired={expired}
    />
  );
}
