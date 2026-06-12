import { createContext, useContext, useState, type ReactNode } from "react";

const KEY = "barbermt_admin_auth";
const API_BASE = import.meta.env.VITE_API_URL || "";

interface AdminAuthCtx {
  authed: boolean;
  login: (password: string) => Promise<boolean>;
  loginBiometric: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AdminAuthCtx>({
  authed: false,
  login: async () => false,
  loginBiometric: async () => {},
  logout: () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(KEY) === "1");

  const login = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(KEY, "1");
        setAuthed(true);
        return true;
      }
    } catch {}
    return false;
  };

  const loginBiometric = async (): Promise<void> => {
    sessionStorage.setItem(KEY, "1");
    setAuthed(true);
  };

  const logout = () => {
    sessionStorage.removeItem(KEY);
    setAuthed(false);
  };

  return <Ctx.Provider value={{ authed, login, loginBiometric, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  return useContext(Ctx);
}
