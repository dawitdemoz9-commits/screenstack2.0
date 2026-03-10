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

    const response = await prisma.response.update({
      where: { id: responseId },
      data: {
        score,
        feedback,
        isManualScore: true,
        isCorrect:     score > 0,
        scoredAt:      new Date(),
      },
    });

    // Recalculate attempt total score
    const allResponses = await prisma.response.findMany({
      where: { attemptId },
    });

    const totalScore = allResponses.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const maxScore = allResponses.reduce((sum, r) => sum + r.maxScore, 0);

    await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        score:  totalScore,   // total of all responses, not just this one
        maxScore,
        passed: maxScore > 0 ? (totalScore / maxScore) * 100 >= 70 : false,
      },
    });

    return NextResponse.json({ response, totalScore, maxScore });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
