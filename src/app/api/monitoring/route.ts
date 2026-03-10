import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logMonitoringEvent } from '@/lib/monitoring';
import { verifyInviteToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

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
      select: { inviteId: true, status: true },
    });

    if (!attempt) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
