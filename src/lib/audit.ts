import { prisma } from './db';

export async function audit(
  action: string,
  resource: string,
  resourceId?: string,
  options: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { userId, ipAddress, userAgent, ...rest } = options;
    await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId,
        userId:    userId as string | undefined,
        ipAddress: ipAddress as string | undefined,
        userAgent: userAgent as string | undefined,
        metadata:  rest as never,
      },
    });
  } catch {
    console.error('[Audit] Failed to write audit log:', { action, resource, resourceId });
  }
}
