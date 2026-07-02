import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { validateBody, companyCreateSchema } from '@/lib/validation';

// GET /api/companies - Get all companies for authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(companies);
  } catch (e) {
    console.error('GET /api/companies failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/companies - Create a new company
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = validateBody(companyCreateSchema, body);
    if (!parsed.success) return parsed.response;

    const company = await prisma.company.create({
      data: {
        ...parsed.data,
        userId: user.id,
      },
    });

    return NextResponse.json(company, { status: 201 });
  } catch (e) {
    console.error('POST /api/companies failed:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
