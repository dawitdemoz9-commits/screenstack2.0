import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const candidates = await prisma.candidate.findMany({
    include: {
      attempts: {
        select: {
          id: true,
          status: true,
          score: true,
          passed: true,
          suspicionScore: true,
          completedAt: true,
          assessment: { select: { title: true, roleType: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ candidates });
}
