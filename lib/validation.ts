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
 * All strings are length-bounded (200 for short scalars, 500 for URLs, 10000
 * for notes/free text). Closed sets (statuses, types, etc.) are enums matching
 * the UI select options in `types/index.ts`. Required create fields enforce a
 * non-empty value; optional fields still accept "" so users can clear them.
 *
 * Optional string columns use `.nullish()` so migrated guest objects that carry
 * `null`/omitted fields still validate.
 */

const shortString = z.string().max(200).nullish();
const urlString = z.string().max(500).nullish();
const longText = z.string().max(10000).nullish();
const requiredShort = z.string().trim().min(1).max(200);

// --- Job -------------------------------------------------------------------
export const jobCreateSchema = z.object({
  company: requiredShort,
  title: requiredShort,
  status: z.enum([
    'Not Started',
    'In Progress',
    'Submitted',
    'Under Review',
    'Interview',
    'Rejected',
    'Offer',
  ]),
  interest: z.coerce.number().int().min(1).max(5),
  dateApplied: shortString,
  deadline: shortString,
  notes: longText,
  jobId: shortString,
  location: shortString,
  salary: shortString,
  applicationCycle: shortString,
  datePosted: shortString,
  contact: shortString,
  contactEmail: shortString,
  contactPhone: shortString,
  resume: z.enum(['None', 'Standard', 'Tailored']).nullish(),
  coverLetter: z.enum(['None', 'Required', 'Submitted']).nullish(),
  url: urlString,
});
export const jobUpdateSchema = jobCreateSchema.partial();

// --- Company ---------------------------------------------------------------
export const companyCreateSchema = z.object({
  name: requiredShort,
  interest: z.coerce.number().int().min(1).max(5),
  industry: z
    .enum([
      'Technology',
      'Finance',
      'Healthcare',
      'Consulting',
      'Retail',
      'Manufacturing',
      'Education',
      'Non-profit',
      'Other',
      '',
    ])
    .nullish(),
  booth: shortString,
  recruiter: shortString,
  position: shortString,
  optFriendly: z.enum(['Yes', 'No', 'Case-by-case', '']).nullish(),
  deadline: shortString,
  website: urlString,
  location: shortString,
  status: z
    .enum([
      'Researching',
      'To Apply',
      'Applied',
      'Interviewing',
      'Offer',
      'Rejected',
      '',
    ])
    .nullish(),
  notes: longText,
});
export const companyUpdateSchema = companyCreateSchema.partial();

// --- Contact ---------------------------------------------------------------
export const contactCreateSchema = z.object({
  name: requiredShort,
  type: z.enum([
    'Career Fair',
    'Alumni',
    'Faculty',
    'Referral',
    'Cold Outreach',
    'Event',
  ]),
  strength: z.enum(['Cold', 'Warm', 'Hot']),
  company: shortString,
  position: shortString,
  email: shortString,
  linkedin: urlString,
  phone: shortString,
  ranking: z.coerce.number().int().min(1).max(5).nullish(),
  isPinned: z.boolean().nullish(),
  notes: longText,
});
export const contactUpdateSchema = contactCreateSchema.partial();

// --- FollowUp --------------------------------------------------------------
export const followupCreateSchema = z.object({
  company: requiredShort,
  type: z.enum([
    'Thank You',
    'Check-in',
    'Application Status',
    'LinkedIn Connection',
  ]),
  dueDate: requiredShort,
  priority: z.enum(['High', 'Medium', 'Low']),
  status: z.enum(['Pending', 'Completed']),
  contact: shortString,
});
export const followupUpdateSchema = followupCreateSchema.partial();

// --- Interview -------------------------------------------------------------
export const interviewCreateSchema = z.object({
  // jobId may be "" (e.g. migrated guest data) — ownership is verified in the
  // route only when a non-empty jobId is supplied.
  jobId: z.string().max(200),
  company: requiredShort,
  position: requiredShort,
  type: z.enum([
    'Phone Screen',
    'Video Call',
    'On-site',
    'Technical',
    'Behavioral',
    'Panel',
  ]),
  date: requiredShort,
  status: z.enum(['Scheduled', 'Completed', 'Cancelled']),
  time: shortString,
  location: shortString,
  interviewers: shortString,
  notes: longText,
});
export const interviewUpdateSchema = interviewCreateSchema.partial();

// --- ResearchContact -------------------------------------------------------
// Matches the ResearchCompany type in types/index.ts (interest is 0-5).
const researchCompanySchema = z.object({
  company: z.string().trim().min(1).max(200),
  position: z.string().max(200).nullish(),
  interest: z.coerce.number().int().min(0).max(5),
});

export const researchCreateSchema = z.object({
  name: requiredShort,
  interest: z.coerce.number().int().min(0).max(5),
  outreachStatus: z.enum(['To Reach Out', 'Reached Out', 'Waiting for Reply']),
  linkedin: urlString,
  companies: z.array(researchCompanySchema).max(50).default([]),
  notes: longText,
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
