import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// Always run fresh — never cache a health check.
export const dynamic = 'force-dynamic';

// Pull the host:port out of a connection string WITHOUT exposing user/password.
function hostOf(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/@([^/?]+)/);
  return m ? m[1] : 'unparseable';
}

function firstLines(err: unknown, n = 3): string {
  return String((err as Error)?.message ?? err)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, n)
    .join(' ');
}

export async function GET() {
  const checks: Record<string, unknown> = { time: new Date().toISOString() };

  // 1. Which env vars are present? (booleans only — never the values)
  checks.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    // Safe to show — the host is not a secret (the password is, and is omitted).
    DATABASE_URL_host: hostOf(process.env.DATABASE_URL),
  };

  // 2. Can we actually reach + authenticate to the database?
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    // Messages like "Can't reach database server" (network/host) vs
    // "authentication failed" (password) — exactly what you need to debug.
    checks.database = { ok: false, error: firstLines(e) };
  }

  // 3. Is a logged-in user session present on this request?
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    checks.auth = { ok: true, signedIn: !!user };
  } catch (e) {
    checks.auth = { ok: false, error: firstLines(e) };
  }

  const envOk = Object.values(checks.env as Record<string, unknown>).every((v) => v !== false);
  const dbOk = (checks.database as { ok: boolean }).ok;
  const healthy = envOk && dbOk;

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', ...checks },
    { status: healthy ? 200 : 503 },
  );
}
