import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // Only allow relative, same-origin redirects (prevents open-redirect abuse).
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/';

  const supabase = await createClient();

  // PKCE flow (default Supabase email links): exchange ?code= for a session.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=Email+link+expired.+Please+sign+in+again.`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Token-hash flow (e.g. custom email templates): verify the OTP token.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=Email+link+expired.+Please+sign+in+again.`);
    }
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No auth params present — nothing to exchange.
  return NextResponse.redirect(`${origin}${next}`);
}
