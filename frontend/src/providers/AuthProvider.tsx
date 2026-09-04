import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthSession, Profile } from "../types";
import { api, ApiError } from "../services/api";

type AuthStatus = "INITIALIZING" | "AUTHENTICATED" | "UNAUTHENTICATED" | "ERROR";
type AuthContextValue = {
  status: AuthStatus;
  user: Profile | null;
  error: string | null;
  refreshIdentity: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { displayName: string; username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  listSessions: () => Promise<AuthSession[]>;
  revokeOtherSessions: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("INITIALIZING");
  const [user, setUser] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshIdentity = useCallback(async () => {
    setError(null);
    try { setUser(await api.authMe()); setStatus("AUTHENTICATED"); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null);
        setStatus("UNAUTHENTICATED");
        return;
      }
      setError(cause instanceof Error ? cause.message : "Não foi possível verificar sua sessão.");
      setUser((current) => {
        if (!current) setStatus("ERROR");
        return current;
      });
      throw cause;
    }
  }, []);
  useEffect(() => { void refreshIdentity().catch(() => undefined); }, [refreshIdentity]);
  const value = useMemo<AuthContextValue>(() => ({
    status, user, error, refreshIdentity,
    async login(email, password) { setUser(await api.login(email, password)); setError(null); setStatus("AUTHENTICATED"); },
    async register(data) { setUser(await api.register(data)); setError(null); setStatus("AUTHENTICATED"); },
    async logout() { try { await api.logout(); } finally { setUser(null); setStatus("UNAUTHENTICATED"); } },
    async forgotPassword(email) { return (await api.forgotPassword(email)).message; },
    async resetPassword(token, password) { await api.resetPassword(token, password); },
    async changePassword(currentPassword, newPassword) { await api.changePassword(currentPassword, newPassword); await refreshIdentity(); },
    listSessions: api.listSessions,
    revokeOtherSessions: api.revokeOtherSessions,
  }), [status, user, refreshIdentity]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("useAuth precisa estar dentro de AuthProvider."); return value; }
