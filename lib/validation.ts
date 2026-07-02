import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Shared request-body validation for the API routes.
 *
 * Every schema WHITELISTS known columns — zod strips unknown keys on parse, so
 * client-supplied `id`, `userId`, `createdAt`, `updatedAt` are dropped rather
 * than trusted. Int fields are coerced (dropdowns/forms send strings). Create
 * schemas require the columns that are NOT NULL in `schema.prisma`; update
 * schemas are the same fields made optional (`.partial()`).
 *
 * Optional string columns use `.nullish()` so migrated guest objects that carry
 * `null`/omitted fields still validate.
 */

const nullableString = z.string().nullish();

// --- Job -------------------------------------------------------------------
export const jobCreateSchema = z.object({
  company: z.string(),
  title: z.string(),
  status: z.string(),
  interest: z.coerce.number().int(),
  dateApplied: nullableString,
  deadline: nullableString,
  notes: nullableString,
  jobId: nullableString,
  location: nullableString,
  salary: nullableString,
  applicationCycle: nullableString,
  datePosted: nullableString,
  contact: nullableString,
  contactEmail: nullableString,
  contactPhone: nullableString,
  resume: nullableString,
  coverLetter: nullableString,
  url: nullableString,
});
export const jobUpdateSchema = jobCreateSchema.partial();

// --- Company ---------------------------------------------------------------
export const companyCreateSchema = z.object({
  name: z.string(),
  interest: z.coerce.number().int(),
  industry: nullableString,
  booth: nullableString,
  recruiter: nullableString,
  position: nullableString,
  optFriendly: nullableString,
  deadline: nullableString,
  website: nullableString,
  location: nullableString,
  status: nullableString,
  notes: nullableString,
});
export const companyUpdateSchema = companyCreateSchema.partial();

// --- Contact ---------------------------------------------------------------
export const contactCreateSchema = z.object({
  name: z.string(),
  type: z.string(),
  strength: z.string(),
  company: nullableString,
  position: nullableString,
  email: nullableString,
  linkedin: nullableString,
  phone: nullableString,
  ranking: z.coerce.number().int().nullish(),
  isPinned: z.boolean().nullish(),
  notes: nullableString,
});
export const contactUpdateSchema = contactCreateSchema.partial();

// --- FollowUp --------------------------------------------------------------
export const followupCreateSchema = z.object({
  company: z.string(),
  type: z.string(),
  dueDate: z.string(),
  priority: z.string(),
  status: z.string(),
  contact: nullableString,
});
export const followupUpdateSchema = followupCreateSchema.partial();

// --- Interview -------------------------------------------------------------
export const interviewCreateSchema = z.object({
  jobId: z.string(),
  company: z.string(),
  position: z.string(),
  type: z.string(),
  date: z.string(),
  status: z.string(),
  time: nullableString,
  location: nullableString,
  interviewers: nullableString,
  notes: nullableString,
});
export const interviewUpdateSchema = interviewCreateSchema.partial();

// --- ResearchContact -------------------------------------------------------
export const researchCreateSchema = z.object({
  name: z.string(),
  interest: z.coerce.number().int(),
  outreachStatus: z.string(),
  linkedin: nullableString,
  companies: z.array(z.any()).default([]),
  notes: nullableString,
});
export const researchUpdateSchema = researchCreateSchema.partial();

/**
 * Validate a request body against a schema.
 * On success returns the parsed (whitelisted, coerced) data.
 * On failure returns a ready-to-send 400 response with per-field messages.
 */
export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
):
  | { success: true; data: T }
  | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Validation failed', fields },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}
