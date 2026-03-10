import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { getSuspicionLevel } from '@/lib/monitoring';
import { getScoreBand, SCORE_BAND_LABELS } from '@/types';

const reviewSchema = z.object({
  recruiterNotes: z.string().optional(),
  recommendation: z.enum(['strong_hire','hire','maybe','no_hire']).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      candidate:  true,
      assessment: {
        include: {
          sections: {
            orderBy: { orderIndex: 'asc' },
            include: {
              questions: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      },
      responses: {
        include: { question: true },
      },
      monitoringEvents: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const pct = attempt.maxScore && attempt.maxScore > 0
    ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
    : 0;

  const band = getScoreBand(pct);
  const bandInfo = SCORE_BAND_LABELS[band];
  const suspicion = getSuspicionLevel(attempt.suspicionScore);

  return NextResponse.json({
    attempt,
    scorePct: pct,
    scoreBand: { band, ...bandInfo },
    suspicion,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { attemptId } = await params;

  try {
    const body = reviewSchema.parse(await req.json());
    const attempt = await prisma.attempt.update({
      where: { id: attemptId },
      data:  { ...body, reviewedAt: new Date() },
    });
    return NextResponse.json({ attempt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
