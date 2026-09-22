import { Link, useLocation, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import type { Content } from "@/types/models";

/**
 * Recém-adicionados: o destaque e as camadas de fundo vêm sempre dos itens
 * mais recentes (created_at), nunca de uma lista escrita à mão.
 */
export function RecentShowcase({ items }: { items: Content[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [front, near, far] = items;
  if (!front) return null;

  return (
    <section className="wrap showcase">
      <div className="showcase__copy">
        <div className="label">Recém-adicionados</div>
        <h2>
          O que entrou
          <br />
          na biblioteca.
        </h2>
        <p className="lede">
          Novos conteúdos são adicionados à coleção e ficam disponíveis para quem já tem acesso.
        </p>
        <Link className="btn btn--secondary" to="/biblioteca">
          Ver tudo
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>

      <div className="showcase__stage">
        {far && (
          <div className="showcase__layer showcase__layer--far" aria-hidden="true">
            <MediaFrame content={far} src={far.thumbnail_url} />
          </div>
        )}
        {near && (
          <div className="showcase__layer showcase__layer--near" aria-hidden="true">
            <MediaFrame content={near} src={near.thumbnail_url} />
          </div>
        )}

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
      </div>
    </section>
  );
}
