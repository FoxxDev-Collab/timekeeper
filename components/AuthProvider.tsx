"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";

type AuthContextValue = {
  isAuthenticated: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("auth_email");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    const isAuthed = !!email;
    const isAuthRoute = pathname?.startsWith("/signin") || pathname?.startsWith("/signup");
    if (!isAuthed && !isAuthRoute) router.replace("/signin");
    if (isAuthed && isAuthRoute) router.replace("/MainPage");
  }, [email, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const ok = await invoke<boolean>("login_user", { email, password });
      if (ok) {
        setEmail(email);
        localStorage.setItem("auth_email", email);
        toast.success("Welcome back");
        return true;
      }
      toast.error("Invalid credentials");
      return false;
    } catch {
      toast.error("Login failed");
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      await invoke<void>("register_user", { email, password });
      toast.success("Account created. You can sign in now.");
      return true;
    } catch (error: unknown) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Registration failed";
      toast.error(message);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setEmail(null);
    localStorage.removeItem("auth_email");
    router.replace("/signin");
  }, [router]);

  const value = useMemo<AuthContextValue>(() => ({ isAuthenticated: !!email, email, login, register, logout }), [email, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


