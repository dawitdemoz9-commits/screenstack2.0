import { prisma } from '@/lib/db';

export async function createNotification({
  userId,
  type,
  title,
  body,
  metadata,
}: {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: { userId, type, title, body, metadata: metadata as never },
  });
}
