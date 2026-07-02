import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, jobCreateSchema } from '@/lib/validation';

// GET /api/jobs - Get all jobs for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (e) {
    console.error('GET /api/jobs failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateBody(jobCreateSchema, body);
    if (!parsed.success) return parsed.response;

    const job = await prisma.job.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error('POST /api/jobs failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
