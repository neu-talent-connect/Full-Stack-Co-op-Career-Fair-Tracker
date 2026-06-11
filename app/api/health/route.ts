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

// The query params (e.g. ?pgbouncer=true) — safe to show, no secrets.
function paramsOf(url?: string): string | null {
  if (!url) return null;
  const i = url.indexOf('?');
  return i === -1 ? '(none)' : url.slice(i + 1);
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
    // Reveals whether ?pgbouncer=true is present (needed for the pooler).
    DATABASE_URL_params: paramsOf(process.env.DATABASE_URL),
  };

  // 2a. Raw connectivity — reaches + authenticates (no prepared statement).
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    // "Can't reach database server" (network/host) vs
    // "authentication failed" (password) — tells you which to fix.
    checks.database = { ok: false, error: firstLines(e) };
  }

  // 2b. Real model query (uses a prepared statement, like create/update/delete).
  // If this FAILS while 2a PASSES, the pooler URL is missing ?pgbouncer=true.
  try {
    const count = await prisma.job.count();
    checks.modelQuery = { ok: true, jobCount: count };
  } catch (e) {
    checks.modelQuery = { ok: false, error: firstLines(e) };
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
  const modelOk = (checks.modelQuery as { ok: boolean }).ok;
  const healthy = envOk && dbOk && modelOk;

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', ...checks },
    { status: healthy ? 200 : 503 },
  );
}
