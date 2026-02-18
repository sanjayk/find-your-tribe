'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const PROTECTED_PATHS = ['/settings', '/onboarding', '/feed'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && isProtected(pathname)) {
      router.replace('/login');
    }
  }, [isLoading, user, pathname, router]);

  if (isLoading) return null;
  if (!user && isProtected(pathname)) return null;

  return <>{children}</>;
}
