import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get('code');

  // `request.url` can reflect an internal host behind Vercel's proxy. Prefer
  // the forwarded host header (set by the proxy) when present, falling back
  // to the URL's own origin otherwise.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const origin = forwardedHost
    ? `${url.protocol}//${forwardedHost}`
    : url.origin;

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
      return NextResponse.redirect(`${origin}/login?error=Sign-in+link+expired+or+invalid+-+please+try+again.`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
