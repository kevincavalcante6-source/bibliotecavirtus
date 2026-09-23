import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getProfile, updateDisplayName as persistName } from "@/demo/services";
import type { Profile } from "@/types/models";

/**
 * MODO DEMONSTRAÇÃO — sessão local, sem servidor.
 * Na aplicação de produção quem responde por isso é `src/auth/AuthProvider.tsx`,
 * com JWT e refresh token do Supabase Auth.
 */

const STORAGE_KEY = "virtus.demo.session";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  accessChecking: boolean;
  refreshAccess: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storedEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function fakeSession(email: string): Session {
  return { user: { id: "demo-user", email } } as unknown as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(storedEmail);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async (address: string) => {
    const loaded = await getProfile();
    setProfile({ ...loaded, email: address });
  }, []);

  useEffect(() => {
    const current = storedEmail();
    if (current) void load(current);
  }, [load]);

  const enter = useCallback(
    async (address: string) => {
      try {
        localStorage.setItem(STORAGE_KEY, address);
      } catch {
        /* segue sem persistir */
      }
      setEmail(address);
      await load(address);
    },
    [load],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session: email ? fakeSession(email) : null,
      user: email ? fakeSession(email).user : null,
      profile: email ? profile : null,
      loading: false,
      isAdmin: Boolean(email) && profile?.role === "admin",
      // Só na demonstração: um e-mail com "semcompra" mostra a tela de quem
      // ainda não tem compra aprovada.
      hasAccess: Boolean(email) && !/semcompra/i.test(email ?? ""),
      accessChecking: false,
      async refreshAccess() {},

      async signIn(address) {
        await enter(address);
      },
      async signUp(address, _password, displayName) {
        await enter(address);
        if (displayName.trim()) await persistName("demo-user", displayName.trim());
        await load(address);
        return { needsConfirmation: false };
      },
      async signOut() {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* segue */
        }
        setEmail(null);
        setProfile(null);
      },
      async requestPasswordReset() {},
      async updatePassword() {},
      async updateDisplayName(displayName) {
        setProfile(await persistName("demo-user", displayName));
      },
      async refreshProfile() {
        if (email) await load(email);
      },
    }),
    [email, profile, enter, load],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
