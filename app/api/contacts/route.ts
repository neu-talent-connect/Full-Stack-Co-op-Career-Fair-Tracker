import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, contactCreateSchema } from '@/lib/validation';

// GET /api/contacts - Get all contacts for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await prisma.contact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contacts);
  } catch (e) {
    console.error('GET /api/contacts failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateBody(contactCreateSchema, body);
    if (!parsed.success) return parsed.response;

    const contact = await prisma.contact.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (e) {
    console.error('POST /api/contacts failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
