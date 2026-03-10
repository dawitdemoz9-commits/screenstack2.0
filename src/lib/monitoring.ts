import { prisma } from './db';
import { EVENT_SUSPICION_SCORES } from '@/types';
import type { MonitoringEventType, MonitoringEventPayload } from '@/types';

// ─── Log a monitoring event and update attempt suspicion score ────────────────

export async function logMonitoringEvent(payload: MonitoringEventPayload): Promise<void> {
  const config = EVENT_SUSPICION_SCORES[payload.eventType as MonitoringEventType];
  const severity = config?.severity ?? 'LOW';
  const delta = config?.delta ?? 0;

  // Create the event (append-only — no updates, no deletes)
  await prisma.monitoringEvent.create({
    data: {
      attemptId:      payload.attemptId,
      eventType:      payload.eventType,
      severity:       severity as never,
      metadata:       payload.metadata as never ?? {},
      timestamp:      new Date(payload.timestamp),
      suspicionDelta: delta,
    },
  });

  // Update the attempt's aggregate suspicion score
  if (delta > 0) {
    await prisma.attempt.update({
      where: { id: payload.attemptId },
      data: {
        suspicionScore:    { increment: delta },
        flaggedEventCount: { increment: 1 },
        lastActivityAt:    new Date(),
      },
    });
  } else {
    await prisma.attempt.update({
      where: { id: payload.attemptId },
      data: { lastActivityAt: new Date() },
    });
  }
}

// ─── Get monitoring timeline for an attempt ───────────────────────────────────

export async function getMonitoringTimeline(attemptId: string) {
  return prisma.monitoringEvent.findMany({
    where: { attemptId },
    orderBy: { timestamp: 'asc' },
  });
}

// ─── Compute risk level from suspicion score ──────────────────────────────────

export function getSuspicionLevel(score: number): {
  level: 'clean' | 'low' | 'medium' | 'high';
  label: string;
  color: string;
} {
  if (score < 10)  return { level: 'clean',  label: 'Clean',       color: 'green'  };
  if (score < 30)  return { level: 'low',    label: 'Low Risk',    color: 'yellow' };
  if (score < 60)  return { level: 'medium', label: 'Medium Risk', color: 'orange' };
  return           { level: 'high',   label: 'High Risk',   color: 'red'    };
}
