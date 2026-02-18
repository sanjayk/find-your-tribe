'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  onboardingCompleted: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = 'tribe_auth';

function loadStoredAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false, isLoading: true };
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { user: parsed.user, accessToken: parsed.accessToken, isAuthenticated: true, isLoading: false };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
  return { user: null, accessToken: null, isAuthenticated: false, isLoading: false };
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>(loadStoredAuth);

  const login = useCallback(
    (data: { accessToken: string; refreshToken: string; user: AuthUser }) => {
      const authData = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      setState({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    router.push('/login');
  }, [router]);

  return { ...state, login, logout };
}
