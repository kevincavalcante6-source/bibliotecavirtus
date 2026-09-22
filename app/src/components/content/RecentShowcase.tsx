import { Link, useLocation, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import type { Content } from "@/types/models";

/**
 * Recém-adicionados: o destaque e as laterais vêm sempre dos itens mais
 * recentes (created_at), nunca de uma lista escrita à mão.
 *
 * Composição: o destaque aparece nítido e inteiro no centro, na proporção
 * original; os secundários ficam ampliados atrás, desfocados e escurecidos,
 * sangrando nas bordas do painel. A profundidade vem só de escala, desfoque e
 * sombra — nenhuma cor nova entra, o painel usa os mesmos tons do site.
 */
export function RecentShowcase({ items }: { items: Content[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [front, near, far] = items;
  const { favorite, toggleFavorite } = useFavoriteToggle(front ?? ({ id: "" } as Content));

  if (!front) return null;

  return (
    <section className="wrap home-section">
      <div className="showcase">
        <header className="showcase__head">
          <span className="label">Recém-adicionados</span>
          <Link className="showcase__more" to="/biblioteca">
            Ver tudo
            <Icon name="arrowRight" size={16} />
          </Link>
        </header>

        <div className="showcase__stage">
          {near && (
            <div className="showcase__flank showcase__flank--left" aria-hidden="true">
              <MediaFrame content={near} src={near.thumbnail_url} />
            </div>
          )}
          {far && (
            <div className="showcase__flank showcase__flank--right" aria-hidden="true">
              <MediaFrame content={far} src={far.thumbnail_url} />
            </div>
          )}

          <div className="showcase__fade" aria-hidden="true" />

          <div className="showcase__feature">
            <button
              type="button"
              className="showcase__front"
              onClick={() => navigate(`/w/${front.id}`, { state: { background: location } })}
              aria-label={`Abrir ${front.title}`}
            >
              <MediaFrame content={front} src={front.thumbnail_url} priority />
              <span className="showcase__caption">
                <em>NOVO</em>
                <b>{front.title}</b>
              </span>
            </button>

            <button
              type="button"
              className="showcase__fav"
              aria-pressed={favorite}
              aria-label={favorite ? `Remover ${front.title} dos favoritos` : `Favoritar ${front.title}`}
              onClick={(event) => void toggleFavorite(event)}
            >
              <Icon name="heart" size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
