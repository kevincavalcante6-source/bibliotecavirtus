import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { addFavorite, listFavoriteIds, removeFavorite } from "@/services/favorites.service";

interface FavoritesContextValue {
  ids: Set<string>;
  ready: boolean;
  isFavorite: (contentId: string) => boolean;
  /** Retorna o novo estado, ou null quando não há sessão. */
  toggle: (contentId: string) => Promise<boolean | null>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIds(new Set());
      setReady(true);
      return;
    }
    setReady(false);
    void listFavoriteIds(user.id)
      .then((list) => {
        if (active) setIds(new Set(list));
      })
      .catch(() => {
        if (active) setIds(new Set());
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (contentId: string) => {
      if (!user) return null;
      const wasFavorite = ids.has(contentId);

      // Otimista: a interface responde na hora e desfaz se o banco recusar.
      setIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.delete(contentId);
        else next.add(contentId);
        return next;
      });

      try {
        if (wasFavorite) await removeFavorite(user.id, contentId);
        else await addFavorite(user.id, contentId);
        return !wasFavorite;
      } catch (error) {
        setIds((current) => {
          const next = new Set(current);
          if (wasFavorite) next.add(contentId);
          else next.delete(contentId);
          return next;
        });
        throw error;
      }
    },
    [user, ids],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ ids, ready, isFavorite: (id) => ids.has(id), toggle }),
    [ids, ready, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites precisa estar dentro de FavoritesProvider.");
  return context;
}
