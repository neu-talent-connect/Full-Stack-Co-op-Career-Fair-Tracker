import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, interviewUpdateSchema } from '@/lib/validation';

// PUT /api/interviews/:id - Update an interview
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
    const parsed = validateBody(interviewUpdateSchema, body);
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

    const interview = await prisma.interview.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: parsed.data,
    });

    if (interview.count === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const updatedInterview = await prisma.interview.findFirst({
      where: { id, userId: user.id },
    });

    return NextResponse.json(updatedInterview);
  } catch (e) {
    console.error('PUT /api/interviews/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/interviews/:id - Delete an interview
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
    const interview = await prisma.interview.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (interview.count === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/interviews/[id] failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
