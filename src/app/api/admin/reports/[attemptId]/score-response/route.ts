import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const schema = z.object({
  responseId: z.string(),
  score:      z.number().min(0),
  feedback:   z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { attemptId } = await params;

  try {
    const { responseId, score, feedback } = schema.parse(await req.json());

    // Wrap the score update and attempt recalculation in a transaction to prevent
    // race conditions when multiple recruiters score responses simultaneously.
    const [response, updatedAttempt] = await prisma.$transaction(async (tx) => {
      const updated = await tx.response.update({
        where: { id: responseId },
        data: {
          score,
          feedback,
          isManualScore: true,
          isCorrect:     score > 0,
          scoredAt:      new Date(),
        },
      });

      // Recalculate attempt total score within the same transaction
      const allResponses = await tx.response.findMany({ where: { attemptId } });
      const attempt = await tx.attempt.findUnique({
        where: { id: attemptId },
        include: { assessment: { select: { passingScore: true } } },
      });

      const totalScore = allResponses.reduce((sum, r) => sum + (r.score ?? 0), 0);
      const maxScore   = allResponses.reduce((sum, r) => sum + r.maxScore, 0);
      const pct        = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const passing    = attempt?.assessment.passingScore ?? 70;

      const recalculated = await tx.attempt.update({
        where: { id: attemptId },
        data: {
          score:    totalScore,
          maxScore,
          passed:   pct >= passing,
        },
      });

      return [updated, recalculated];
    });

    return NextResponse.json({
      response,
      totalScore: updatedAttempt.score,
      maxScore:   updatedAttempt.maxScore,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
