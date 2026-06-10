import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/research/:id - Get a single research contact
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
    const researchContact = await prisma.researchContact.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!researchContact) {
      return NextResponse.json({ error: 'Research contact not found' }, { status: 404 });
    }

    return NextResponse.json(researchContact);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/research/:id - Update a research contact
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

    // Remove fields that shouldn't be updated
    const { id: bodyId, userId, createdAt, ...updateData } = body;

    // Coerce Prisma Int field — form inputs send strings
    if (updateData.interest !== undefined) {
      updateData.interest = Number(updateData.interest);
    }

    const researchContact = await prisma.researchContact.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data: updateData,
    });

    if (researchContact.count === 0) {
      return NextResponse.json({ error: 'Research contact not found' }, { status: 404 });
    }

    // Fetch the updated research contact
    const updatedContact = await prisma.researchContact.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedContact);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/research/:id - Delete a research contact
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
    const researchContact = await prisma.researchContact.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (researchContact.count === 0) {
      return NextResponse.json({ error: 'Research contact not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
