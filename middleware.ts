import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — race against a 3 s timeout so a paused/unreachable
  // Supabase instance causes a graceful degradation (no auth) instead of a
  // 504 MIDDLEWARE_INVOCATION_TIMEOUT on Vercel.
  // The .catch() on getUser() is critical: if the timeout wins and getUser()
  // later rejects, without .catch() it becomes an unhandled rejection that
  // crashes the Next.js dev server on the next request.
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  try {
    await Promise.race([supabase.auth.getUser().catch(() => null), timeout]);
  } catch {
    // Supabase unreachable — continue without a refreshed session.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
