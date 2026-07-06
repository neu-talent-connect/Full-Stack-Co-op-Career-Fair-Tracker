'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
// import { createClient } from '@/lib/supabase/client'; // re-enable with email/password sign-in
// import { useRouter } from 'next/navigation';          // re-enable with email/password sign-in

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState(searchParams.get('error') || '');
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Email/password sign-in is temporarily disabled — Google is the only live
  // provider. Northeastern students all have a Husky Google Workspace account,
  // so Google isn't a friction point. The logic below is kept (commented) so we
  // can re-enable email/password later without rewriting it.
  // ---------------------------------------------------------------------------
  // const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false);
  //
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //
  //   // Basic validation
  //   if (!email.trim()) {
  //     setError('Email is required');
  //     return;
  //   }
  //
  //   if (!password) {
  //     setError('Password is required');
  //     return;
  //   }
  //
  //   setIsLoading(true);
  //
  //   const supabase = createClient();
  //   const { error } = await supabase.auth.signInWithPassword({
  //     email: email.trim(),
  //     password,
  //   });
  //
  //   if (error) {
  //     setError('Invalid email or password');
  //     setIsLoading(false);
  //     return;
  //   }
  //
  //   router.push('/');
  //   router.refresh();
  // };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Career Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in with your Google account
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <GoogleSignInButton onError={setError} disabled={isLoading} />

          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            Works with any Google account — personal or your Husky (Northeastern) email.
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-northeastern-red hover:underline font-medium"
            >
              Continue as guest →
            </Link>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              No account needed — your data stays in this browser.
            </p>
          </div>

          {/* Email/password sign-in — disabled for now, shown grayed out so it's
              clear the option exists but isn't available yet. */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
              or
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <div
            className="space-y-4 opacity-50 select-none"
            aria-hidden="true"
          >
            <Input
              label="Email"
              type="email"
              value=""
              readOnly
              placeholder="you@example.com"
              disabled
              tabIndex={-1}
            />
            <Input
              label="Password"
              type="password"
              value=""
              readOnly
              placeholder="••••••••"
              disabled
              tabIndex={-1}
            />
            <Button type="button" className="w-full" disabled>
              Sign In
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Email &amp; password sign-in isn&apos;t available yet — please use Google.
          </p>
        </div>
      </Card>
    </div>
  );
}
