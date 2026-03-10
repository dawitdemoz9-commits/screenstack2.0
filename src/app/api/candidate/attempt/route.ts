import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyInviteToken } from '@/lib/auth';
import { audit } from '@/lib/audit';

const startSchema = z.object({
  inviteId:     z.string(),
  accessToken:  z.string(),
  identityData: z.object({
    name:  z.string(),
    email: z.string().email(),
  }),
  consentGiven: z.boolean(),
  permissions:  z.object({
    camera:  z.boolean().optional(),
    mic:     z.boolean().optional(),
    screen:  z.boolean().optional(),
  }).optional(),
});

// Create or resume an attempt
export async function POST(req: NextRequest) {
  try {
    const body = startSchema.parse(await req.json());

    // Verify signed invite token
    const tokenData = await verifyInviteToken(body.accessToken);
    if (!tokenData || tokenData.inviteId !== body.inviteId) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
    }

    const invite = await prisma.invite.findUnique({
      where: { id: body.inviteId },
      include: { attempt: true },
    });

    if (!invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status === 'CANCELLED') return NextResponse.json({ error: 'Invite cancelled' }, { status: 410 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 });

    // Resume existing attempt
    if (invite.attempt) {
      const attempt = await prisma.attempt.findUnique({
        where: { id: invite.attempt.id },
        include: {
          responses: {
            select: { questionId: true, answer: true },
          },
        },
      });
      return NextResponse.json({ attempt, resumed: true });
    }

    // Create new attempt
    const attempt = await prisma.attempt.create({
      data: {
        inviteId:               body.inviteId,
        candidateId:            invite.candidateId,
        assessmentId:           invite.assessmentId,
        status:                 body.consentGiven ? 'IN_PROGRESS' : 'CONSENT_GIVEN',
        identityVerifiedAt:     new Date(),
        identityData:           body.identityData as never,
        consentGivenAt:         body.consentGiven ? new Date() : undefined,
        consentVersion:         body.consentGiven ? 'v1.0' : undefined,
        startedAt:              body.consentGiven ? new Date() : undefined,
        cameraGranted:          body.permissions?.camera,
        micGranted:             body.permissions?.mic,
        screenGranted:          body.permissions?.screen,
        lastActivityAt:         new Date(),
      },
    });

    await prisma.invite.update({
      where: { id: body.inviteId },
      data: { status: 'IN_PROGRESS', usedAt: new Date() },
    });

    await audit('attempt.created', 'attempt', attempt.id, {
      candidateId:  invite.candidateId,
      assessmentId: invite.assessmentId,
    });

    return NextResponse.json({ attempt, resumed: false }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Attempt POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Get assessment questions for an active attempt
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const attemptId   = searchParams.get('attemptId');
  const accessToken = searchParams.get('t');

  if (!attemptId || !accessToken) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: { invite: true },
  });

  if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify token still belongs to this attempt's invite
  const tokenData = await verifyInviteToken(accessToken);
  if (!tokenData || tokenData.inviteId !== attempt.inviteId) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Load questions (hide correct answers from candidate!)
  const assessment = await prisma.assessment.findUnique({
    where: { id: attempt.assessmentId },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true, type: true, title: true, body: true,
              orderIndex: true, points: true, timeLimitSec: true,
              evaluator: true, difficulty: true, skillTags: true,
              // Return config but STRIP correct answers
              config: true,
            },
          },
        },
      },
    },
  });

  if (!assessment) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

  // Strip correct answers from config before sending to candidate
  const sanitizedAssessment = {
    ...assessment,
    sections: assessment.sections.map((section) => ({
      ...section,
      questions: section.questions.map((q) => ({
        ...q,
        config: stripCorrectAnswers(q.config as Record<string, unknown>, q.evaluator),
      })),
    })),
  };

  // Load existing responses for resume
  const responses = await prisma.response.findMany({
    where: { attemptId },
    select: { questionId: true, answer: true },
  });

  return NextResponse.json({
    assessment: sanitizedAssessment,
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      timeElapsed: attempt.timeElapsed,
    },
    responses,
  });
}

function stripCorrectAnswers(
  config: Record<string, unknown>,
  evaluator: string
): Record<string, unknown> {
  const stripped = { ...config };
  if (evaluator === 'multiple_choice' || evaluator === 'multi_select') {
    delete stripped.correct;
    delete stripped.explanation;
    delete stripped.solutionCode;
  }
  if (evaluator === 'code') {
    delete stripped.solutionCode;
    // Hide hidden test cases
    if (Array.isArray(stripped.testCases)) {
      stripped.testCases = (stripped.testCases as Record<string,unknown>[]).filter(
        (tc) => !tc.isHidden
      );
    }
  }
  if (evaluator === 'sql') {
    delete stripped.expectedSql;
    delete stripped.expectedResultHash;
  }
  return stripped;
}
