import { useLocation, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import type { Content } from "@/types/models";

export function ContentCard({ content, priority }: { content: Content; priority?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { favorite, toggleFavorite } = useFavoriteToggle(content);

  // A listagem por trás permanece montada: ao fechar o detalhe, a posição de
  // scroll volta exatamente onde estava.
  function open() {
    navigate(`/w/${content.id}`, { state: { background: location } });
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
        onClick={(event) => void toggleFavorite(event)}
      >
        <Icon name="heart" size={18} />
      </button>

      {/* Só o nome. Proporção, formato e downloads vivem no detalhe, onde há
          espaço para eles sem competir com a arte. */}
      <div className="card__meta">
        <h3>{content.title}</h3>
      </div>
    </article>
  );
}
