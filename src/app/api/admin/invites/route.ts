import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { signInviteToken } from '@/lib/auth';
import { audit } from '@/lib/audit';

const inviteSchema = z.object({
  assessmentId:  z.string(),
  candidateName: z.string().min(1),
  candidateEmail: z.string().email(),
  message:        z.string().optional(),
  expiresInDays:  z.number().int().min(1).max(30).default(7),
});

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assessmentId = searchParams.get('assessmentId');

  const invites = await prisma.invite.findMany({
    where: {
      createdById: user.role === 'ADMIN' ? undefined : user.id,
      ...(assessmentId ? { assessmentId } : {}),
    },
    include: {
      candidate:  { select: { name: true, email: true } },
      assessment: { select: { title: true, roleType: true } },
      attempt: {
        select: { id: true, status: true, score: true, maxScore: true, passed: true, suspicionScore: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invites });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  try {
    const body = inviteSchema.parse(await req.json());

    // Upsert candidate
    const candidate = await prisma.candidate.upsert({
      where: { email: body.candidateEmail.toLowerCase() },
      update: { name: body.candidateName },
      create: {
        email: body.candidateEmail.toLowerCase(),
        name:  body.candidateName,
      },
    });

    // Check for existing pending invite
    const existing = await prisma.invite.findFirst({
      where: {
        candidateId:  candidate.id,
        assessmentId: body.assessmentId,
        status:       { in: ['PENDING', 'SENT', 'OPENED'] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'An active invite already exists for this candidate' },
        { status: 409 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);

    const invite = await prisma.invite.create({
      data: {
        candidateId:  candidate.id,
        assessmentId: body.assessmentId,
        createdById:  user.id,
        message:      body.message,
        expiresAt,
        status:       'SENT',
        sentAt:       new Date(),
      },
    });

    // Generate signed access token for the candidate link
    const accessToken = await signInviteToken(invite.id, candidate.id);
    await prisma.invite.update({
      where: { id: invite.id },
      data:  { accessToken },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const assessmentLink = `${appUrl}/assess/${invite.id}?t=${accessToken}`;

    // In production, send email here. For dev, log to console.
    if (process.env.EMAIL_MOCK !== 'false') {
      console.log('\n📧 [EMAIL MOCK] Assessment Invite');
      console.log(`   To: ${candidate.email}`);
      console.log(`   Link: ${assessmentLink}\n`);
    }

    await audit('invite.created', 'invite', invite.id, {
      userId: user.id,
      candidateId: candidate.id,
      assessmentId: body.assessmentId,
    });

    return NextResponse.json({ invite, assessmentLink }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 });
    }
    console.error('[Invites POST]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
