import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

// GET /api/research - Get all research contacts for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const researchContacts = await prisma.researchContact.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(researchContacts);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/research - Create a new research contact
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Remove id if provided (let Prisma generate it)
    const { id, createdAt, ...contactData } = body;

    // Coerce Prisma Int field — form inputs send strings
    if (contactData.interest !== undefined) {
      contactData.interest = Number(contactData.interest);
    }

    // companies is a Json column — default to an empty array if missing
    if (contactData.companies === undefined) {
      contactData.companies = [];
    }

    const researchContact = await prisma.researchContact.create({
      data: {
        ...contactData,
        userId: user.id,
      },
    });

    return NextResponse.json(researchContact, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
