import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  login as loginRequest,
  logout as logoutRequest,
  getCurrentUser as getCurrentUserRequest,
} from '../api/authApi.js';
import { clearAuth, getCurrentUser, getToken, setCurrentUser, setToken } from './tokenStorage.js';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());
  const [token, setTokenState] = useState(() => getToken());
  const [isLoading, setIsLoading] = useState(true);

  // A stored token can be expired, or belong to an account deactivated since it was
  // issued. GET /api/auth/me is the approved live re-check for exactly this (per
  // docs/authentication/api-spec.md section 4), so re-verify the stored session once
  // on load rather than trusting localStorage blindly.
  useEffect(() => {
    let isMounted = true;

    async function verifyStoredSession() {
      const storedToken = getToken();

      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUserRequest(storedToken);

        if (isMounted) {
          setCurrentUser(currentUser);
          setUser(currentUser);
        }
      } catch {
        clearAuth();

        if (isMounted) {
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    verifyStoredSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = Boolean(token && user);

  const hasRole = useCallback(
    (...roleCodes) => Boolean(user?.role?.code) && roleCodes.includes(user.role.code),
    [user],
  );

  const login = useCallback(async (username, password) => {
    const result = await loginRequest(username, password);

    setToken(result.accessToken);
    setCurrentUser(result.user);

    setTokenState(result.accessToken);
    setUser(result.user);

    return result;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = getToken();

    clearAuth();
    setTokenState(null);
    setUser(null);

    if (currentToken) {
      try {
        await logoutRequest(currentToken);
      } catch {
        // Best-effort only. Per the approved api-spec (section 6/12), the server holds
        // no token state to revoke, so a failed logout call must never block clearing
        // local session state above - that clearing is what "logged out" actually means.
      }
    }
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    hasRole,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
