import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { registerVisit } from "@/services/visits.service";
import type { Content } from "@/types/models";

interface LastVisitValue {
  /** Publicado depois da visita anterior desta pessoa. */
  isNew: (content: Content) => boolean;
}

const LastVisitContext = createContext<LastVisitValue>({ isNew: () => false });

/** Voltar à aba depois de um tempo também conta como atividade da visita. */
const RECHECK_AFTER_MS = 10 * 60 * 1000;

/**
 * O selo "Novo" usa a data da visita anterior, guardada no perfil. Ela é
 * lida uma vez por visita: dentro da mesma visita o selo não some enquanto a
 * pessoa navega, e na próxima visita recomeça a partir de agora.
 */
export function LastVisitProvider({ children }: { children: ReactNode }) {
  const { session, hasAccess } = useAuth();
  const userId = session?.user?.id ?? null;
  const [previousVisit, setPreviousVisit] = useState<number | null>(null);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    lastCheck.current = Date.now();
    try {
      const at = await registerVisit();
      setPreviousVisit(at ? Date.parse(at) : null);
    } catch {
      /* sem selo é melhor que selo errado */
    }
  }, []);

  useEffect(() => {
    setPreviousVisit(null);
    if (!userId || !hasAccess) return;
    void check();

    function onVisible() {
      if (document.visibilityState === "visible" && Date.now() - lastCheck.current > RECHECK_AFTER_MS) {
        void check();
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, hasAccess, check]);

  const value = useMemo<LastVisitValue>(
    () => ({
      isNew: (content) => previousVisit !== null && Date.parse(content.created_at) > previousVisit,
    }),
    [previousVisit],
  );

  return <LastVisitContext.Provider value={value}>{children}</LastVisitContext.Provider>;
}

export function useLastVisit() {
  return useContext(LastVisitContext);
}
