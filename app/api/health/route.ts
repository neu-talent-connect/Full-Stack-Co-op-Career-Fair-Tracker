import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// Always run fresh — never cache a health check.
export const dynamic = 'force-dynamic';

// Coarse error category only — never expose raw error text on a public route.
// "unreachable" = network/host, "auth-failed" = password, "query-failed" = rest.
function categorize(err: unknown): 'unreachable' | 'auth-failed' | 'query-failed' {
  const msg = String((err as Error)?.message ?? err).toLowerCase();
  if (
    msg.includes("can't reach") ||
    msg.includes('econnrefused') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('p1001')
  ) {
    return 'unreachable';
  }
  if (msg.includes('authentication failed') || msg.includes('password') || msg.includes('p1000')) {
    return 'auth-failed';
  }
  return 'query-failed';
}

export async function GET() {
  const checks: Record<string, unknown> = { time: new Date().toISOString() };

  // 1. Which env vars are present? (booleans only — never the values)
  checks.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DIRECT_URL: !!process.env.DIRECT_URL,
    // Boolean only — reveals whether ?pgbouncer=true is present (needed for
    // the pooler) without exposing the host or any other URL detail.
    DATABASE_URL_pgbouncer: /[?&]pgbouncer=true/.test(process.env.DATABASE_URL ?? ''),
  };

  // 2a. Raw connectivity — reaches + authenticates (no prepared statement).
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    // "unreachable" (network/host) vs "auth-failed" (password) —
    // tells you which to fix.
    checks.database = { ok: false, error: categorize(e) };
  }

  // 2b. Real model query (uses a prepared statement, like create/update/delete).
  // If this FAILS while 2a PASSES, the pooler URL is missing ?pgbouncer=true.
  try {
    await prisma.job.count();
    checks.modelQuery = { ok: true };
  } catch (e) {
    checks.modelQuery = { ok: false, error: categorize(e) };
  }

  // 3. Is a logged-in user session present on this request?
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    checks.auth = { ok: true, signedIn: !!user };
  } catch (e) {
    checks.auth = { ok: false, error: categorize(e) };
  }

  // Only the four presence booleans gate health — the pgbouncer flag is
  // informational (2b already fails when it actually matters).
  const env = checks.env as Record<string, boolean>;
  const envOk =
    env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.DATABASE_URL &&
    env.DIRECT_URL;
  const dbOk = (checks.database as { ok: boolean }).ok;
  const modelOk = (checks.modelQuery as { ok: boolean }).ok;
  const healthy = envOk && dbOk && modelOk;

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', ...checks },
    { status: healthy ? 200 : 503 },
  );
}
