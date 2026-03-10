import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Rate limit: 10 login attempts per minute per IP
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(`login:${ip}`, 10, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rl.resetAfter} seconds.` },
      {
        status: 429,
        headers: {
          'Retry-After': String(rl.resetAfter),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      await audit('auth.login.failed', 'user', user.id, { ipAddress: ip });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role,
    });

    await setAuthCookie(token);

    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    await audit('auth.login', 'user', user.id, { ipAddress: ip });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 });
    }
    console.error('[Login]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
