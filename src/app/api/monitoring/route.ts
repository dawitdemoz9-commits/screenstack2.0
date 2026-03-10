import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logMonitoringEvent } from '@/lib/monitoring';
import { verifyInviteToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createNotification } from '@/lib/notifications';

const eventSchema = z.object({
  attemptId:   z.string(),
  accessToken: z.string(),
  eventType:   z.string(),
  metadata:    z.record(z.unknown()).optional(),
  timestamp:   z.string(),
});

// POST /api/monitoring/event
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`monitoring:${ip}`, 120, 60);
    if (!rl.allowed) return NextResponse.json({ ok: true }); // silently drop excess

    const body = eventSchema.parse(await req.json());

    // Validate access token against attempt
    const attempt = await prisma.attempt.findUnique({
      where: { id: body.attemptId },
      select: { inviteId: true, status: true, suspicionScore: true },
    });

    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const scoreBeforeEvent = attempt.suspicionScore ?? 0;
    if (attempt.status === 'COMPLETED') {
      // Still log but don't error — late events can arrive after submit
    }

    const tokenData = await verifyInviteToken(body.accessToken);
    if (!tokenData || tokenData.inviteId !== attempt.inviteId) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    await logMonitoringEvent({
      attemptId: body.attemptId,
      eventType: body.eventType as never,
      metadata:  body.metadata,
      timestamp: body.timestamp,
    });

    // Check if suspicion just crossed the alert threshold (50)
    try {
      const updatedAttempt = await prisma.attempt.findUnique({
        where: { id: body.attemptId },
        select: { suspicionScore: true, flaggedEventCount: true, candidateId: true, assessmentId: true, inviteId: true },
      });
      const THRESHOLD = 50;
      // Fire once: when this event pushed the score from below the threshold to at/above it
      if (updatedAttempt && scoreBeforeEvent < THRESHOLD && updatedAttempt.suspicionScore >= THRESHOLD) {
        const invite = await prisma.invite.findUnique({ where: { id: updatedAttempt.inviteId }, select: { createdById: true } });
        if (invite) {
          const candidate = await prisma.candidate.findUnique({ where: { id: updatedAttempt.candidateId }, select: { name: true } });
          const assessment = await prisma.assessment.findUnique({ where: { id: updatedAttempt.assessmentId }, select: { title: true } });
          await createNotification({
            userId: invite.createdById,
            type: 'high_suspicion',
            title: '⚠ Suspicious Activity Detected',
            body: `${candidate?.name ?? 'A candidate'} triggered integrity alerts during "${assessment?.title ?? 'an assessment'}" (suspicion score: ${Math.round(updatedAttempt.suspicionScore)})`,
            metadata: { attemptId: body.attemptId, suspicionScore: updatedAttempt.suspicionScore },
          });
        }
      }
    } catch { /* never surface monitoring errors */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    // Monitoring failures must never surface to candidate
    console.error('[Monitoring]', err);
    return NextResponse.json({ ok: true }); // silently succeed
  }
}
