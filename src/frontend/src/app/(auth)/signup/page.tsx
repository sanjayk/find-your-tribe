'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SIGNUP } from '@/lib/graphql/mutations/auth';
import type { SignupData } from '@/lib/graphql/types';
import { useAuth } from '@/hooks/use-auth';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [signupMutation, { loading }] = useMutation<SignupData>(SIGNUP, {
    onCompleted: (data) => {
      const payload = data.auth.signup;
      login(payload);
      router.push('/onboarding');
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    signupMutation({ variables: { displayName, username, email, password } });
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-surface-elevated rounded-2xl shadow-md p-8">
          {/* Header */}
          <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-2">
            Join the builders
          </h1>
          <p className="text-[14px] text-ink-secondary mb-8">
            Show what you ship, find your tribe
          </p>

          {/* Error */}
          {error && (
            <div className="bg-error-subtle text-error rounded-lg p-3 text-[13px] mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="displayName"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Maya Chen"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mayachen"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-[13px] font-medium text-ink-secondary mb-1.5 block"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-[13px] text-ink-secondary mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
