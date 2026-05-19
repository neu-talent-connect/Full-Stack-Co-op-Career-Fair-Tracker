import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
    const body = await request.json();
    const { id: bodyId, userId, createdAt, ...updateData } = body;

    const interview = await prisma.interview.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: updateData,
    });

    if (interview.count === 0) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const updatedInterview = await prisma.interview.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedInterview);
  } catch {
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
