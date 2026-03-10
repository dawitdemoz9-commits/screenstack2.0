/**
 * POST /api/admin/assessments/[id]/import
 * Batch-creates sections and questions from a generated assessment structure.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const questionSchema = z.object({
  type:        z.string(),
  title:       z.string(),
  body:        z.string(),
  points:      z.number().default(10),
  difficulty:  z.enum(['easy', 'medium', 'hard']).default('medium'),
  evaluator:   z.string().default('manual'),
  skillTags:   z.array(z.string()).default([]),
  config:      z.record(z.unknown()).default({}),
  platform:    z.string().optional(),
});

const sectionSchema = z.object({
  title:       z.string(),
  description: z.string().optional(),
  questions:   z.array(questionSchema),
});

const bodySchema = z.object({
  sections: z.array(sectionSchema),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id: assessmentId } = await params;

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (assessment.createdById !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { sections } = bodySchema.parse(await req.json());
    let totalQuestions = 0;

    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const section = await prisma.assessmentSection.create({
        data: {
          title:        sec.title,
          description:  sec.description,
          orderIndex:   si,
          assessmentId,
        },
      });

      for (let qi = 0; qi < sec.questions.length; qi++) {
        const q = sec.questions[qi];
        await prisma.question.create({
          data: {
            sectionId:  section.id,
            type:       q.type as never,
            title:      q.title,
            body:       q.body,
            points:     q.points,
            difficulty: q.difficulty,
            evaluator:  q.evaluator,
            skillTags:  q.skillTags,
            orderIndex: qi,
            config:     q.config as never,
          },
        });
        totalQuestions++;
      }
    }

    return NextResponse.json({ ok: true, totalQuestions });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Import POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
