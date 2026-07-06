'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
// import { useRouter } from 'next/navigation';          // re-enable with email/password signup
// import { createClient } from '@/lib/supabase/client'; // re-enable with email/password signup

export default function SignupPage() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Email/password signup is temporarily disabled — Google is the only live
  // provider (see app/login/page.tsx for the rationale). Google's OAuth flow
  // handles both first-time signup and returning sign-in, so there's no separate
  // email/password account creation for now. The logic below is kept (commented)
  // so we can re-enable it later without rewriting it.
  // ---------------------------------------------------------------------------
  // const router = useRouter();
  // const [name, setName] = useState('');
  // const [email, setEmail] = useState('');
  // const [password, setPassword] = useState('');
  // const [confirmPassword, setConfirmPassword] = useState('');
  // const [showPassword, setShowPassword] = useState(false);
  // const [success, setSuccess] = useState(false);
  // const [resending, setResending] = useState(false);
  // const [resent, setResent] = useState(false);
  //
  // const validateForm = () => {
  //   // Email validation
  //   if (!email.trim()) {
  //     setError('Email is required');
  //     return false;
  //   }
  //
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   if (!emailRegex.test(email)) {
  //     setError('Please enter a valid email address');
  //     return false;
  //   }
  //
  //   // Password validation
  //   if (!password) {
  //     setError('Password is required');
  //     return false;
  //   }
  //
  //   if (password.length < 8) {
  //     setError('Password must be at least 8 characters long');
  //     return false;
  //   }
  //
  //   // Confirm password validation
  //   if (password !== confirmPassword) {
  //     setError('Passwords do not match');
  //     return false;
  //   }
  //
  //   // Name validation (if provided)
  //   if (name && name.trim().length > 100) {
  //     setError('Name must be less than 100 characters');
  //     return false;
  //   }
  //
  //   return true;
  // };
  //
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setError('');
  //
  //   // Client-side validation
  //   if (!validateForm()) {
  //     return;
  //   }
  //
  //   setIsLoading(true);
  //
  //   const supabase = createClient();
  //   const { error } = await supabase.auth.signUp({
  //     email: email.trim(),
  //     password,
  //     options: {
  //       data: { name: name.trim() || undefined },
  //     },
  //   });
  //
  //   if (error) {
  //     setError(error.message || 'Something went wrong');
  //     setIsLoading(false);
  //     return;
  //   }
  //
  //   setSuccess(true);
  //   setIsLoading(false);
  // };
  //
  // const handleResend = async () => {
  //   setResending(true);
  //   const supabase = createClient();
  //   const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
  //   if (!error) setResent(true);
  //   setResending(false);
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
              Create your account with Google
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <GoogleSignInButton label="Sign up with Google" onError={setError} disabled={isLoading} />

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

          {/* Email/password signup — disabled for now, shown grayed out so it's
              clear the option exists but isn't available yet. */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
              or
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <div className="space-y-4 opacity-50 select-none" aria-hidden="true">
            <Input label="Name (optional)" type="text" value="" readOnly placeholder="John Doe" disabled tabIndex={-1} />
            <Input label="Email" type="email" value="" readOnly placeholder="you@example.com" disabled tabIndex={-1} />
            <Input label="Password" type="password" value="" readOnly placeholder="••••••••" disabled tabIndex={-1} />
            <Button type="button" className="w-full" disabled>
              Sign Up
            </Button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Email &amp; password signup isn&apos;t available yet — please use Google.
          </p>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-northeastern-red hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
