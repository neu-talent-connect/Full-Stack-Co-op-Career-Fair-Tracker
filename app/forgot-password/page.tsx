'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Email/password sign-in is disabled (Google OAuth + guest mode only — see
// CLAUDE.md Auth flow section), so this page is dormant. Redirect anyone who
// lands here via an old bookmark straight to /login.
export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
