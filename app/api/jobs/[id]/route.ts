import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, jobUpdateSchema } from '@/lib/validation';

// GET /api/jobs/:id - Get a single job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (e) {
    console.error('GET /api/jobs/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/jobs/:id - Update a job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = validateBody(jobUpdateSchema, body);
    if (!parsed.success) return parsed.response;

    const job = await prisma.job.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: parsed.data,
    });

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch the updated job (scoped to the user)
    const updatedJob = await prisma.job.findFirst({
      where: { id, userId: user.id },
    });

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(updatedJob);
  } catch (e) {
    console.error('PUT /api/jobs/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/jobs/:id - Delete a job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    // Interview.jobId has no FK — delete dependent interviews with the job,
    // atomically, so no orphaned Interview rows are left behind.
    const [, job] = await prisma.$transaction([
      prisma.interview.deleteMany({
        where: { jobId: id, userId: user.id },
      }),
      prisma.job.deleteMany({
        where: {
          id,
          userId: user.id,
        },
      }),
    ]);

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/jobs/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
