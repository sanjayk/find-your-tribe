'use client';

import { useState, useCallback, useEffect } from 'react';
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

const SERVER_SAFE_STATE: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

function readStoredAuth(stored: string | null): AuthState {
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
  const [state, setState] = useState<AuthState>(SERVER_SAFE_STATE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const nextState = readStoredAuth(stored);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Must read localStorage after mount to avoid SSR hydration mismatch
    setState(nextState);
  }, []);

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
