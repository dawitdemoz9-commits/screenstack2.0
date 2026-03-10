import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyInviteToken } from '@/lib/auth';
import { evaluate } from '@/lib/evaluators';
import { createNotification } from '@/lib/notifications';

const schema = z.object({
  accessToken: z.string(),
  answer:      z.record(z.unknown()),
  isFinal:     z.boolean().default(false), // true = final submit, false = autosave
});

// Save (autosave or final submit) a response to one question
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;
  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get('q');

  if (!questionId) return NextResponse.json({ error: 'Missing questionId' }, { status: 400 });

  try {
    const body = schema.parse(await req.json());

    // Verify token
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tokenData = await verifyInviteToken(body.accessToken);
    if (!tokenData || tokenData.inviteId !== attempt.inviteId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Assessment not in progress' }, { status: 409 });
    }

    // Get question for evaluation
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });

    // Auto-evaluate
    const result = await evaluate(
      question.evaluator,
      question.config as Record<string, unknown>,
      body.answer,
      question.points,
      question.scoringRules as Record<string, unknown>
    );

    // Upsert response (handles both autosave and final submit)
    const response = await prisma.response.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId,
        questionId,
        answer:    body.answer  as never,
        maxScore:  question.points,
        score:     result.score,
        isCorrect: result.isCorrect ?? undefined,
        feedback:  result.feedback,
        isManualScore: result.requiresManualReview,
        scoredAt:  new Date(),
      },
      update: {
        answer:    body.answer as never,
        score:     result.score,
        isCorrect: result.isCorrect ?? undefined,
        feedback:  result.feedback,
        isManualScore: result.requiresManualReview,
        scoredAt:  new Date(),
      },
    });

    // Save code snapshot for code/sql questions
    if (['CODING_CHALLENGE','SQL_CHALLENGE','DEBUGGING_CHALLENGE'].includes(question.type)) {
      const code = (body.answer.code || body.answer.query || '') as string;
      if (code) {
        await prisma.codeSnapshot.create({
          data: {
            attemptId,
            questionId,
            code,
            language: (body.answer.language as string) || 'text',
          },
        });
      }
    }

    // Update attempt activity timestamp
    await prisma.attempt.update({
      where: { id: attemptId },
      data: { lastActivityAt: new Date(), currentQuestionId: questionId },
    });

    return NextResponse.json({ response, result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Response PUT]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Final submission — mark attempt complete
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;

  try {
    const { accessToken } = z.object({ accessToken: z.string() }).parse(await req.json());

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        responses: { include: { question: { include: { section: true } } } },
        assessment: { include: { sections: { include: { questions: true } } } },
      },
    });
    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tokenData = await verifyInviteToken(accessToken);
    if (!tokenData || tokenData.inviteId !== attempt.inviteId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const totalScore = attempt.responses.reduce((s, r) => s + (r.score ?? 0), 0);
    // Use ALL questions (not just answered ones) so skipped questions count as 0
    const maxScore   = attempt.assessment.sections.flatMap(s => s.questions).reduce((s, q) => s + q.points, 0);
    const pct        = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Compute per-section scores
    const sectionScores: Record<string, { score: number; maxScore: number; pct: number }> = {};
    for (const section of attempt.assessment.sections) {
      const sectionResponses = attempt.responses.filter(
        (r) => r.question.sectionId === section.id
      );
      const sScore    = sectionResponses.reduce((s, r) => s + (r.score ?? 0), 0);
      const sMaxScore = section.questions.reduce((s, q) => s + q.points, 0);
      sectionScores[section.id] = {
        score:    sScore,
        maxScore: sMaxScore,
        pct:      sMaxScore > 0 ? Math.round((sScore / sMaxScore) * 100) : 0,
      };
    }

    const timeElapsed = attempt.startedAt
      ? Math.round((Date.now() - attempt.startedAt.getTime()) / 1000)
      : 0;

    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status:        'COMPLETED',
        completedAt:   new Date(),
        timeElapsed,
        score:         totalScore,
        maxScore,
        passed:        pct >= (attempt.assessment.passingScore ?? 70),
        sectionScores: sectionScores as never,
      },
    });

    await prisma.invite.update({
      where: { id: attempt.inviteId },
      data: { status: 'COMPLETED' },
    });

    // Notify the recruiter who sent the invite
    try {
      const invite = await prisma.invite.findUnique({
        where: { id: attempt.inviteId },
        select: { createdById: true },
      });
      if (invite) {
        const candidate = await prisma.candidate.findUnique({
          where: { id: attempt.candidateId },
          select: { name: true },
        });
        const assessment = await prisma.assessment.findUnique({
          where: { id: attempt.assessmentId },
          select: { title: true },
        });
        await createNotification({
          userId: invite.createdById,
          type: 'attempt_completed',
          title: 'Assessment Completed',
          body: `${candidate?.name ?? 'A candidate'} has completed "${assessment?.title ?? 'an assessment'}" with a score of ${Math.round(pct)}%`,
          metadata: { attemptId, candidateName: candidate?.name, assessmentTitle: assessment?.title, score: Math.round(pct), passed: pct >= (attempt.assessment.passingScore ?? 70) },
        });
      }
    } catch { /* notification failure must not break submission */ }

    return NextResponse.json({ attempt: updated, score: totalScore, maxScore, pct });
  } catch (err) {
    console.error('[Submit POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
