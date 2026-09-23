import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getProfile, updateDisplayName as persistDisplayName } from "@/services/profiles.service";
import { checkAccess } from "@/services/access.service";
import type { Profile } from "@/types/models";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** Comprou (ou é admin) e confirmou o e-mail: pode usar a biblioteca. */
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // O resultado guarda a quem se refere: logo após o login a sessão já existe
  // mas a verificação ainda não voltou, e isso conta como "verificando" — nunca
  // como "sem acesso", que faria a tela de bloqueio piscar para quem comprou.
  const [access, setAccess] = useState<{ uid: string | null; state: "checking" | "granted" | "denied" }>(
    { uid: null, state: "denied" },
  );
  const loadedFor = useRef<string | null>(null);
  const accessTicket = useRef(0);

  // A sessão vem do Supabase (JWT + refresh token em storage gerido pelo SDK)
  // e é revalidada no servidor a cada requisição. Nada aqui concede acesso.
  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    try {
      setProfile(await getProfile(id));
    } catch {
      setProfile(null);
    }
  }, []);

  const loadAccess = useCallback(async (uid: string) => {
    const ticket = ++accessTicket.current;
    setAccess({ uid, state: "checking" });
    let granted = false;
    try {
      granted = await checkAccess();
    } catch {
      granted = false;
    }
    if (ticket === accessTicket.current) setAccess({ uid, state: granted ? "granted" : "denied" });
  }, []);

  useEffect(() => {
    if (!userId) {
      accessTicket.current += 1;
      setAccess({ uid: null, state: "denied" });
      return;
    }
    void loadAccess(userId);
  }, [userId, loadAccess]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      loadedFor.current = null;
      return;
    }
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      hasAccess: access.uid === userId && access.state === "granted",
      accessChecking: userId !== null && (access.uid !== userId || access.state === "checking"),
      async refreshAccess() {
        if (userId) await loadAccess(userId);
      },

      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },

      async signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },

      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
      },

      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/nova-senha`,
        });
        if (error) throw error;
      },

      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      },

      async updateDisplayName(displayName) {
        if (!userId) throw new Error("Sessão expirada.");
        setProfile(await persistDisplayName(userId, displayName));
      },

      async refreshProfile() {
        if (userId) await loadProfile(userId);
      },
    }),
    [session, profile, loading, userId, loadProfile, access, loadAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de AuthProvider.");
  return context;
}
