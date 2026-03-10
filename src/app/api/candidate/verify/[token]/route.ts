import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyInviteToken } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { searchParams } = new URL(req.url);
  const accessToken = searchParams.get('t') || '';

  // Verify the signed access token
  const tokenData = await verifyInviteToken(accessToken);
  if (!tokenData || tokenData.inviteId !== token) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });
  }

  const invite = await prisma.invite.findUnique({
    where: { id: token },
    include: {
      candidate:  true,
      assessment: {
        select: {
          id: true,
          title: true,
          description: true,
          roleType: true,
          timeLimit: true,
          passingScore: true,
          monitoringEnabled: true,
          requireCamera: true,
          requireMicrophone: true,
          requireScreen: true,
          instructions: true,
          sections: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
              _count: { select: { questions: true } },
            },
          },
        },
      },
      attempt: { select: { id: true, status: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  if (invite.status === 'CANCELLED') return NextResponse.json({ error: 'This invite has been cancelled' }, { status: 410 });
  if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
    await prisma.invite.update({ where: { id: token }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  // Mark as opened if first time
  if (invite.status === 'SENT') {
    await prisma.invite.update({ where: { id: token }, data: { status: 'OPENED', openedAt: new Date() } });
  }

  return NextResponse.json({ invite });
}
