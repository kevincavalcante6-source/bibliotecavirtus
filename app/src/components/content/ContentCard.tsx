import { useLocation, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/auth/AuthProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/components/feedback/ToastProvider";
import { readableError } from "@/lib/supabase";
import { formatNumber, formatRatio } from "@/lib/format";
import type { Content } from "@/types/models";

export function ContentCard({ content, priority }: { content: Content; priority?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const { notify, notifyError } = useToast();
  const favorite = isFavorite(content.id);

  // A listagem por trás permanece montada: ao fechar o detalhe, a posição de
  // scroll volta exatamente onde estava.
  function open() {
    navigate(`/w/${content.id}`, { state: { background: location } });
  }

  async function onToggleFavorite(event: React.MouseEvent) {
    event.stopPropagation();
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
  }

  return (
    <article className="card">
      <button type="button" className="card__open" onClick={open} aria-label={`Abrir ${content.title}`}>
        <MediaFrame content={content} src={content.thumbnail_url} priority={priority} />
        <span className="card__overlay">
          <span>
            <Icon name="download" size={16} />
            Baixar
          </span>
        </span>
      </button>

      <button
        type="button"
        className="card__fav"
        aria-pressed={favorite}
        aria-label={favorite ? `Remover ${content.title} dos favoritos` : `Favoritar ${content.title}`}
        onClick={onToggleFavorite}
      >
        <Icon name="heart" size={18} />
      </button>

      <div className="card__meta">
        <h3>{content.title}</h3>
        <p>
          {content.type === "widget" ? "Widget" : formatRatio(content.width, content.height)}
          {content.download_count > 0 && ` · ${formatNumber(content.download_count)} downloads`}
        </p>
      </div>
    </article>
  );
}
