import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

const updateSchema = z.object({
  title:             z.string().min(1).max(200).optional(),
  description:       z.string().optional(),
  roleType:          z.string().optional(),
  instructions:      z.string().optional(),
  timeLimit:         z.number().int().min(5).max(360).optional(),
  passingScore:      z.number().int().min(0).max(100).optional(),
  monitoringEnabled: z.boolean().optional(),
  requireCamera:     z.boolean().optional(),
  requireMicrophone: z.boolean().optional(),
  requireScreen:     z.boolean().optional(),
  isActive:          z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;
  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      },
      _count: { select: { invites: true, attempts: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ assessment });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;

  try {
    const body = updateSchema.parse(await req.json());
    const assessment = await prisma.assessment.update({
      where: { id },
      data: body,
    });

    await audit('assessment.updated', 'assessment', id, { userId: user.id, changes: body });

    return NextResponse.json({ assessment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  await prisma.assessment.update({ where: { id }, data: { isActive: false } });

  await audit('assessment.deleted', 'assessment', id, { userId: user.id });

  return NextResponse.json({ ok: true });
}
