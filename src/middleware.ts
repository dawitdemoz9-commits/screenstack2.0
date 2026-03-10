import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';

// Paths that require authentication
const ADMIN_PATHS = ['/admin'];
const AUTH_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p));

  const user = await getAuthUserFromRequest(request);

  // Redirect logged-in users away from login page
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Protect admin routes
  if (isAdminPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Admin-only routes
    if (pathname.startsWith('/admin') && !['ADMIN', 'RECRUITER'].includes(user.role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Add security headers to every response
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assess).*)',
  ],
};
