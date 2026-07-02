import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, followupCreateSchema } from '@/lib/validation';

// GET /api/followups - Get all follow-ups for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const followups = await prisma.followUp.findMany({
      where: { userId: user.id },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json(followups);
  } catch (e) {
    console.error('GET /api/followups failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/followups - Create a new follow-up
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateBody(followupCreateSchema, body);
    if (!parsed.success) return parsed.response;

    const followup = await prisma.followUp.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(followup, { status: 201 });
  } catch (e) {
    console.error('POST /api/followups failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
