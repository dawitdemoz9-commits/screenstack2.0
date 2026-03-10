import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const patchSchema = z.object({
  config: z.record(z.unknown()),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { id } = await params;

  try {
    const body = patchSchema.parse(await req.json());

    const question = await prisma.question.update({
      where: { id },
      data: { config: body.config as never },
    });

    return NextResponse.json({ question });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Questions PATCH]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
