import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// PUT /api/followups/:id - Update a follow-up
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { id: bodyId, userId, createdAt, ...updateData } = body;

    const followup = await prisma.followUp.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: updateData,
    });

    if (followup.count === 0) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    const updatedFollowup = await prisma.followUp.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedFollowup);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/followups/:id - Delete a follow-up
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
    const followup = await prisma.followUp.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (followup.count === 0) {
      return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
