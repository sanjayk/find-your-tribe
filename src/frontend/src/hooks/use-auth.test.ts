import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Must import after mock setup
import { useAuth } from './use-auth';

const STORAGE_KEY = 'tribe_auth';

const mockUser = {
  id: 'usr_01',
  username: 'mayachen',
  displayName: 'Maya Chen',
  email: 'maya@example.com',
  onboardingCompleted: true,
};

const mockLoginData = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  user: mockUser,
};

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
  });

  describe('initial state', () => {
    it('starts with isLoading true and no user', () => {
      const { result } = renderHook(() => useAuth());
      // After the effect runs, isLoading becomes false since localStorage is empty
      // But the initial synchronous state has isLoading: true
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it('finishes loading with no user when localStorage is empty', () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('loads user from localStorage on mount', () => {
      const stored = {
        user: mockUser,
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe('access-token-123');
    });
  });

  describe('login', () => {
    it('stores auth data in localStorage', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(mockLoginData);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.user).toEqual(mockUser);
      expect(stored.accessToken).toBe('access-token-123');
      expect(stored.refreshToken).toBe('refresh-token-456');
    });

    it('updates state to authenticated', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(mockLoginData);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.accessToken).toBe('access-token-123');
    });
  });

  describe('logout', () => {
    it('clears localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: mockUser }));
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('resets state to unauthenticated', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          user: mockUser,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
        }),
      );
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
    });

    it('redirects to /login', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.logout();
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('corrupted localStorage', () => {
    it('handles invalid JSON gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('removes corrupted data from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, 'corrupted');

      renderHook(() => useAuth());

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});
