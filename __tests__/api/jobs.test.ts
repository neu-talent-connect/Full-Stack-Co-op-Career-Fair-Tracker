import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/jobs/route'
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/jobs/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
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

const mockJob = {
  id: 'job-db-001',
  userId: MOCK_USER.id,
  company: 'Google',
  title: 'SWE Intern',
  status: 'Submitted',
  interest: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

// ---------------------------------------------------------------------------
// GET /api/jobs
// ---------------------------------------------------------------------------
describe('GET /api/jobs', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns jobs for the authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.findMany).mockResolvedValue([mockJob] as any)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].company).toBe('Google')
  })
})

// ---------------------------------------------------------------------------
// POST /api/jobs
// ---------------------------------------------------------------------------
describe('POST /api/jobs', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ company: 'Google', title: 'SWE', status: 'Submitted', interest: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a job and returns 201', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.create).mockResolvedValue(mockJob as any)

    const req = new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ company: 'Google', title: 'SWE', status: 'Submitted', interest: 3 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('job-db-001')
  })

  it('strips any client-provided id so Prisma generates its own', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.create).mockResolvedValue(mockJob as any)

    const req = new Request('http://localhost/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ id: 'fake-local-id', company: 'Google', title: 'SWE', status: 'Submitted', interest: 3 }),
    })
    await POST(req)

    const createCall = vi.mocked(prisma.job.create).mock.calls[0][0]
    expect(createCall.data).not.toHaveProperty('id')
    expect(createCall.data.userId).toBe(MOCK_USER.id)
  })
})

// ---------------------------------------------------------------------------
// GET /api/jobs/[id]
// ---------------------------------------------------------------------------
describe('GET /api/jobs/[id]', () => {
  const params = Promise.resolve({ id: 'job-db-001' })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/jobs/job-db-001')
    const res = await GET_ONE(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when job not found', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.findFirst).mockResolvedValue(null)

    const req = new Request('http://localhost/api/jobs/job-db-001')
    const res = await GET_ONE(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns the job when found', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.findFirst).mockResolvedValue(mockJob as any)

    const req = new Request('http://localhost/api/jobs/job-db-001')
    const res = await GET_ONE(req, { params })
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/jobs/[id]
// ---------------------------------------------------------------------------
describe('PUT /api/jobs/[id]', () => {
  const params = Promise.resolve({ id: 'job-db-001' })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/jobs/job-db-001', {
      method: 'PUT',
      body: JSON.stringify({ status: 'Interview' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the job does not exist in DB (e.g. sample-data ID)', async () => {
    // This is the core bug: loadSampleData creates IDs that only live in React
    // state, not the database. updateMany finds 0 rows → 404.
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.updateMany).mockResolvedValue({ count: 0 })

    const fakeParams = Promise.resolve({ id: 'sample-data-fake-id' })
    const req = new Request('http://localhost/api/jobs/sample-data-fake-id', {
      method: 'PUT',
      body: JSON.stringify({ status: 'Interview' }),
    })
    const res = await PUT(req, { params: fakeParams })
    expect(res.status).toBe(404)
  })

  it('updates the job and returns 200', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.job.findUnique).mockResolvedValue({ ...mockJob, status: 'Interview' } as any)

    const req = new Request('http://localhost/api/jobs/job-db-001', {
      method: 'PUT',
      body: JSON.stringify({ status: 'Interview' }),
    })
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('Interview')
  })

  it('scopes the update to the authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.updateMany).mockResolvedValue({ count: 1 })
    vi.mocked(prisma.job.findUnique).mockResolvedValue(mockJob as any)

    const req = new Request('http://localhost/api/jobs/job-db-001', {
      method: 'PUT',
      body: JSON.stringify({ status: 'Interview' }),
    })
    await PUT(req, { params })

    const updateCall = vi.mocked(prisma.job.updateMany).mock.calls[0][0]
    expect(updateCall.where).toMatchObject({ id: 'job-db-001', userId: MOCK_USER.id })
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/jobs/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/jobs/[id]', () => {
  const params = Promise.resolve({ id: 'job-db-001' })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(unauthClient() as any)
    const req = new Request('http://localhost/api/jobs/job-db-001', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when the job does not exist in DB (e.g. sample-data ID)', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.deleteMany).mockResolvedValue({ count: 0 })

    const fakeParams = Promise.resolve({ id: 'sample-data-fake-id' })
    const req = new Request('http://localhost/api/jobs/sample-data-fake-id', { method: 'DELETE' })
    const res = await DELETE(req, { params: fakeParams })
    expect(res.status).toBe(404)
  })

  it('deletes the job and returns success', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.deleteMany).mockResolvedValue({ count: 1 })

    const req = new Request('http://localhost/api/jobs/job-db-001', { method: 'DELETE' })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('scopes the delete to the authenticated user', async () => {
    vi.mocked(createClient).mockResolvedValue(authClient() as any)
    vi.mocked(prisma.job.deleteMany).mockResolvedValue({ count: 1 })

    const req = new Request('http://localhost/api/jobs/job-db-001', { method: 'DELETE' })
    await DELETE(req, { params })

    const deleteCall = vi.mocked(prisma.job.deleteMany).mock.calls[0]![0]!
    expect(deleteCall.where).toMatchObject({ id: 'job-db-001', userId: MOCK_USER.id })
  })
})
