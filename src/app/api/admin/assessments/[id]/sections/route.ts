import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const sectionSchema = z.object({
  title:        z.string().min(1),
  description:  z.string().optional(),
  orderIndex:   z.number().int().default(0),
  timeLimitMin: z.number().int().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id: assessmentId } = await params;

  try {
    const body = sectionSchema.parse(await req.json());
    const section = await prisma.assessmentSection.create({
      data: { ...body, assessmentId },
    });
    return NextResponse.json({ section }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
