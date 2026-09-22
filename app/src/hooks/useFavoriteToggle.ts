import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/components/feedback/ToastProvider";
import { readableError } from "@/lib/supabase";
import type { Content } from "@/types/models";

/**
 * Favoritar é o mesmo gesto no card, no destaque e no detalhe: sem sessão,
 * leva ao login guardando de onde veio; com sessão, alterna e avisa.
 */
export function useFavoriteToggle(content: Content) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { notify, notifyError } = useToast();

  const favorite = isFavorite(content.id);

  const toggleFavorite = useCallback(
    async (event?: { stopPropagation: () => void }) => {
      event?.stopPropagation();

      if (!session) {
        notify("Entre na sua conta para salvar favoritos.");
        navigate("/login", { state: { from: location.pathname } });
        return;
      }

      try {
        const next = await toggle(content.id);
        notify(next ? "Adicionado aos favoritos" : "Removido dos favoritos");
      } catch (error) {
        notifyError(readableError(error, "Não foi possível atualizar seus favoritos."));
      }
    },
    [session, content.id, toggle, notify, notifyError, navigate, location.pathname],
  );

  return { favorite, toggleFavorite };
}
