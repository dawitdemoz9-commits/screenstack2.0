import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;

  const source = await prisma.assessment.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: { questions: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });

  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Non-template assessments can only be cloned by their owner (templates are public)
  if (!source.isTemplate && source.createdById !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clone = await prisma.assessment.create({
    data: {
      title:             `${source.title} (Copy)`,
      description:       source.description,
      roleType:          source.roleType,
      instructions:      source.instructions,
      timeLimit:         source.timeLimit,
      passingScore:      source.passingScore,
      monitoringEnabled: true,
      requireCamera:     source.requireCamera,
      requireMicrophone: source.requireMicrophone,
      requireScreen:     source.requireScreen,
      isTemplate:        false,
      createdById:       user.id,
      sections: {
        create: source.sections.map((sec) => ({
          title:       sec.title,
          description: sec.description,
          orderIndex:  sec.orderIndex,
          questions: {
            create: sec.questions.map((q) => ({
              type:        q.type,
              title:       q.title,
              body:        q.body,
              points:      q.points,
              difficulty:  q.difficulty,
              evaluator:   q.evaluator,
              skillTags:   q.skillTags,
              orderIndex:  q.orderIndex,
              config:      q.config as never,
              platform:    q.platform,
            })),
          },
        })),
      },
    },
  });

  await audit('assessment.cloned', 'assessment', clone.id, {
    userId: user.id,
    sourceId: id,
  });

  return NextResponse.json({ assessment: clone }, { status: 201 });
}
