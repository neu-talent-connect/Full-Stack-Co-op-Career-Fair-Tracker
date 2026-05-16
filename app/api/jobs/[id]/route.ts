import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/jobs/:id - Get a single job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.job.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/jobs/:id - Update a job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Remove fields that shouldn't be updated
    const { id: bodyId, userId, createdAt, ...updateData } = body;

    const job = await prisma.job.updateMany({
      where: {
        id,
        userId: session.user.id,
      },
      data: updateData,
    });

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch the updated job
    const updatedJob = await prisma.job.findUnique({
      where: { id },
    });

    return NextResponse.json(updatedJob);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/jobs/:id - Delete a job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const job = await prisma.job.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (job.count === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
