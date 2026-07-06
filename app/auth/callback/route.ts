import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Where to land after a successful code exchange. Defaults to home for the
  // Google OAuth flow; a sanitized `?next=` lets other flows (e.g. the currently
  // dormant password-reset path) redirect elsewhere. Only allow same-origin
  // relative paths (an open-redirect guard — never honor an absolute or
  // protocol-relative URL).
  const nextParam = searchParams.get('next') ?? '/';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=Email+link+expired.+Please+sign+in+again.`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
