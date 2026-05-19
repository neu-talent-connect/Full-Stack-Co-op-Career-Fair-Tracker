import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/jobs - Get all jobs for authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Remove id if provided (let Prisma generate it)
    const { id, ...jobData } = body;

    const job = await prisma.job.create({
      data: {
        ...jobData,
        userId: session.user.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
