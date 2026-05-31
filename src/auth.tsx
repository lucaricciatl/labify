import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string; message?: string; token?: string; user?: User }>;
  logout: () => void;
  verifyEmail: (token: string) => Promise<{ error?: string; message?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string; message?: string }>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

function networkError(err: unknown, url?: string): { error: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
    const endpoint = url || `${API_BASE || window.location.origin}/api`;
    return { error: `Cannot reach the API at ${endpoint}. Is the backend running?` };
  }
  return { error: msg };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem("labify-token");
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setState({ user: data.user, token, loading: false }))
      .catch(() => {
        localStorage.removeItem("labify-token");
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const url = `${API_BASE}/api/auth/login`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Login failed" };
      localStorage.setItem("labify-token", data.token);
      setState({ user: data.user, token: data.token, loading: false });
      return {};
    } catch (err) {
      return networkError(err, url);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const url = `${API_BASE}/api/auth/register`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Registration failed" };
      if (data.token) {
        localStorage.setItem("labify-token", data.token);
        setState({ user: data.user, token: data.token, loading: false });
      }
      return { message: data.message, token: data.token, user: data.user };
    } catch (err) {
      return networkError(err, url);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("labify-token");
    setState({ user: null, token: null, loading: false });
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Verification failed" };
      return { message: data.message };
    } catch (err) {
      return networkError(err);
    }
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || "Resend failed" };
      return { message: data.message };
    } catch (err) {
      return networkError(err);
    }
  }, []);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
      if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
      if (!headers["Content-Type"] && init?.body && typeof init.body === "string") headers["Content-Type"] = "application/json";
      return fetch(`${API_BASE}${path}`, { ...init, headers });
    },
    [state.token]
  );

  return (
    <AuthContext.Provider
      value={{ user: state.user, loading: state.loading, login, register, logout, verifyEmail, resendVerification, apiFetch }}
    >
      {children}
    </AuthContext.Provider>
  );
}
