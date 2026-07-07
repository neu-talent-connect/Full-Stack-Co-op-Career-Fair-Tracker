import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, interviewCreateSchema } from '@/lib/validation';

// GET /api/interviews - Get all interviews for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const interviews = await prisma.interview.findMany({
      where: { userId: user.id },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(interviews);
  } catch (e) {
    console.error('GET /api/interviews failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/interviews - Create a new interview
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateBody(interviewCreateSchema, body);
    if (!parsed.success) return parsed.response;

    // A non-empty jobId must reference a job owned by this user.
    if (parsed.data.jobId) {
      const job = await prisma.job.findFirst({
        where: { id: parsed.data.jobId, userId: user.id },
      });
      if (!job) {
        return NextResponse.json(
          { error: 'jobId does not match one of your jobs' },
          { status: 400 }
        );
      }
    }

    const interview = await prisma.interview.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (e) {
    console.error('POST /api/interviews failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
