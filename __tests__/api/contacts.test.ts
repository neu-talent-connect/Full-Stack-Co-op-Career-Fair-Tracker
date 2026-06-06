import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/contacts/route'
import { PUT, DELETE } from '@/app/api/contacts/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

const MOCK_USER = { id: 'user-abc-123' }

function authClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
  }
}

function unauthClient() {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }
}

const mockContact = {
  id: 'contact-db-001',
  userId: MOCK_USER.id,
  name: 'Jane Smith',
  company: 'Microsoft',
  type: 'Career Fair',
  strength: 'Warm',
  createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------
// GET /api/contacts
// ---------------------------------------------------------------------------
describe('GET /api/contacts', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns contacts for the authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.findMany).mockResolvedValue([mockContact] as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body[0].name).toBe('Jane Smith')
  })
})

// ---------------------------------------------------------------------------
// POST /api/contacts
// ---------------------------------------------------------------------------
describe('POST /api/contacts', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane', type: 'Career Fair', strength: 'Cold' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a contact and returns 201', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.create).mockResolvedValue(mockContact as any)

    const req = new Request('http://localhost/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Jane Smith', type: 'Career Fair', strength: 'Warm' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Jane Smith')
  })
})

// ---------------------------------------------------------------------------
// PUT /api/contacts/[id]
// ---------------------------------------------------------------------------
describe('PUT /api/contacts/[id]', () => {
  const params = Promise.resolve({ id: 'contact-db-001' })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/contacts/contact-db-001', {
      method: 'PUT',
      body: JSON.stringify({ strength: 'Hot' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contact does not exist in DB (e.g. sample-data ID)', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.updateMany).mockResolvedValue({ count: 0 })

    const fakeParams = Promise.resolve({ id: 'sample-data-fake-id' })
    const req = new Request('http://localhost/api/contacts/sample-data-fake-id', {
      method: 'PUT',
      body: JSON.stringify({ strength: 'Hot' }),
    })
    const res = await PUT(req, { params: fakeParams })
    expect(res.status).toBe(404)
  })

  it('updates the contact and returns 200', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.contact.findUnique).mockResolvedValue({ ...mockContact, strength: 'Hot' } as any)

    const req = new Request('http://localhost/api/contacts/contact-db-001', {
      method: 'PUT',
      body: JSON.stringify({ strength: 'Hot' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.strength).toBe('Hot')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/contacts/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/contacts/[id]', () => {
  const params = Promise.resolve({ id: 'contact-db-001' })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/contacts/contact-db-001', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when contact does not exist in DB (e.g. sample-data ID)', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.deleteMany).mockResolvedValue({ count: 0 })

    const fakeParams = Promise.resolve({ id: 'sample-data-fake-id' })
    const req = new Request('http://localhost/api/contacts/sample-data-fake-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: fakeParams })
    expect(res.status).toBe(404)
  })

  it('deletes the contact and returns success', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.contact.deleteMany).mockResolvedValue({ count: 1 })

    const req = new Request('http://localhost/api/contacts/contact-db-001', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
