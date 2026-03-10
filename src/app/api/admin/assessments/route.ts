import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

const createSchema = z.object({
  title:              z.string().min(1).max(200),
  description:        z.string().optional(),
  roleType:           z.string().min(1),
  instructions:       z.string().optional(),
  timeLimit:          z.number().int().min(5).max(360).default(60),
  passingScore:       z.number().int().min(0).max(100).default(70),
  monitoringEnabled:  z.boolean().default(false),
  requireCamera:      z.boolean().default(false),
  requireMicrophone:  z.boolean().default(false),
  requireScreen:      z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q') || '';
  const roleType = searchParams.get('role') || '';
  const includeTemplates = searchParams.get('templates') === 'true';

  const assessments = await prisma.assessment.findMany({
    where: {
      createdById: user.role === 'ADMIN' ? undefined : user.id, // admins see all
      isActive:    true,
      isTemplate:  includeTemplates ? undefined : false,
      ...(search   ? { title: { contains: search, mode: 'insensitive' } } : {}),
      ...(roleType ? { roleType } : {}),
    },
    include: {
      _count: { select: { sections: true, invites: true, attempts: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ assessments });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const body = createSchema.parse(await req.json());

    const assessment = await prisma.assessment.create({
      data: {
        ...body,
        createdById: user.id,
      },
    });

    await audit('assessment.created', 'assessment', assessment.id, { userId: user.id });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Assessments POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
