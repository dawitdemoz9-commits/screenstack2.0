import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const updateSchema = z.object({
  title:        z.string().min(1).optional(),
  body:         z.string().min(1).optional(),
  orderIndex:   z.number().int().optional(),
  points:       z.number().int().min(1).optional(),
  timeLimitSec: z.number().int().nullable().optional(),
  evaluator:    z.string().optional(),
  config:       z.record(z.unknown()).optional(),
  scoringRules: z.record(z.unknown()).optional(),
  difficulty:   z.enum(['easy','medium','hard']).optional(),
  skillTags:    z.array(z.string()).optional(),
  platform:     z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;

  try {
    const body = updateSchema.parse(await req.json());
    const question = await prisma.question.update({
      where: { id },
      data: {
        ...body,
        config:       body.config as never,
        scoringRules: body.scoringRules as never,
      },
    });
    return NextResponse.json({ question });
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

  const { id } = await params;
  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
