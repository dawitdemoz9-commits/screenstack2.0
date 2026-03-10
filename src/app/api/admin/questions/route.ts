import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const questionSchema = z.object({
  sectionId:    z.string(),
  type:         z.enum([
    'MULTIPLE_CHOICE','MULTI_SELECT','SHORT_ANSWER','LONG_ANSWER',
    'CODING_CHALLENGE','SQL_CHALLENGE','DEBUGGING_CHALLENGE',
    'FILE_UPLOAD','SCENARIO','ARCHITECTURE','ENTERPRISE_SCENARIO',
  ]),
  title:        z.string().min(1),
  body:         z.string().min(1),
  orderIndex:   z.number().int().default(0),
  points:       z.number().int().min(1).default(10),
  timeLimitSec: z.number().int().optional(),
  evaluator:    z.string().default('manual'),
  config:       z.record(z.unknown()).default({}),
  scoringRules: z.record(z.unknown()).default({}),
  difficulty:   z.enum(['easy','medium','hard']).default('medium'),
  skillTags:    z.array(z.string()).default([]),
  platform:     z.string().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search     = searchParams.get('search') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const type       = searchParams.get('type') || '';
  const platform   = searchParams.get('platform') || '';

  const questions = await prisma.question.findMany({
    where: {
      ...(search ? { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { body:  { contains: search, mode: 'insensitive' } },
      ]} : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(type ? { type: type as never } : {}),
      ...(platform ? { platform } : {}),
      section: { assessment: { isTemplate: true } },
    },
    include: { section: { include: { assessment: { select: { title: true, roleType: true } } } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const body = questionSchema.parse(await req.json());
    const question = await prisma.question.create({
      data: {
        ...body,
        config:       body.config as never,
        scoringRules: body.scoringRules as never,
      },
    });
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Questions POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
