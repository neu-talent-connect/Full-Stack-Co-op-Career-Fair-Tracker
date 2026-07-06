'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const DISMISSED_KEY = 'guestBannerDismissed';

/**
 * Persistent, dismissible hint shown only to guests. Makes the value of signing
 * up explicit — guest data lives only in this browser and can be lost.
 */
export function GuestModeBanner() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  // Hide while resolving auth, for signed-in users, when dismissed, or on the
  // auth pages themselves (where a "sign up" nudge would be redundant).
  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
  const onAuthPage = authPaths.includes(pathname);
  if (authLoading || user || dismissed || onAuthPage) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
          You&apos;re in <strong>guest mode</strong> — your data is saved only in this browser.{' '}
          <Link href="/signup" className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
            Sign up
          </Link>{' '}
          to save it and sync across devices.
        </p>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors shrink-0"
          aria-label="Dismiss guest mode notice"
        >
          <X className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </button>
      </div>
    </div>
  );
}
