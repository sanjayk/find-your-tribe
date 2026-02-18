'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LOGIN } from '@/lib/graphql/mutations/auth';
import type { LoginData } from '@/lib/graphql/types';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [loginMutation, { loading }] = useMutation<LoginData>(LOGIN, {
    onCompleted: (data) => {
      const payload = data.auth.login;
      login(payload);
      if (!payload.user.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    },
    onError: (err) => {
      setError(err.message || 'Something went wrong. Please try again.');
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    loginMutation({ variables: { email, password } });
  }

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-surface-elevated rounded-2xl shadow-md p-8">
          {/* Header */}
          <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-2">
            Welcome back
          </h1>
          <p className="text-[14px] text-ink-secondary mb-8">
            Sign in to continue building
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
                placeholder="Your password"
                className="w-full bg-surface-primary rounded-lg px-4 py-3 text-[14px] text-ink placeholder:text-ink-tertiary outline-none transition-colors focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white rounded-lg px-6 py-3 font-medium text-[14px] hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-[13px] text-ink-secondary mt-6">
            New here?{' '}
            <Link href="/signup" className="text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
