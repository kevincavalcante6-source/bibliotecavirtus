import { useCallback, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MediaFrame } from "@/components/content/MediaFrame";
import { Icon } from "@/components/ui/Icon";
import { useAutoRotate } from "@/hooks/useAutoRotate";
import { useFavoriteToggle } from "@/hooks/useFavoriteToggle";
import type { Content } from "@/types/models";

const SWIPE_THRESHOLD = 44;

/**
 * Recém-adicionados: só wallpapers, sempre derivados de created_at, nunca de
 * uma lista escrita à mão.
 *
 * Composição: o destaque aparece nítido e inteiro no centro, na proporção
 * original; o anterior e o próximo ficam ampliados atrás, desfocados e
 * escurecidos, sangrando nas bordas do painel. Eles também são a navegação —
 * tocar em um traz aquele conteúdo para o centro, e no toque vale arrastar.
 *
 * A vitrine avança sozinha enquanto ninguém a toca. Qualquer gesto da pessoa
 * a faz recuar por alguns segundos e depois ela retoma; com o ponteiro em
 * cima, fica parada o tempo que for (ver useAutoRotate).
 */
export function RecentShowcase({ items }: { items: Content[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);

  const total = items.length;
  const at = (offset: number) => items[(index + offset + total * 2) % total];
  const front = at(0);
  const { favorite, toggleFavorite } = useFavoriteToggle(front ?? ({ id: "" } as Content));

  const advance = useCallback(() => {
    setIndex((current) => (current + 1) % Math.max(1, total));
  }, [total]);

  const rotation = useAutoRotate<HTMLDivElement>({
    enabled: total > 1,
    onAdvance: advance,
  });

  // Qualquer gesto da pessoa tem prioridade: a rotação recua e volta depois.
  const go = useCallback(
    (delta: number) => {
      rotation.hold();
      setIndex((current) => (current + delta + total) % total);
    },
    [rotation, total],
  );

  if (!front) return null;

  const cycles = total > 1;
  const previous = cycles ? at(-1) : undefined;
  const next = cycles ? at(1) : undefined;

  return (
    <section className="wrap home-section">
      <div
        className="showcase"
        ref={rotation.containerRef}
        onMouseEnter={rotation.enter}
        onMouseLeave={rotation.leave}
        onFocusCapture={rotation.hold}
      >
        <header className="showcase__head">
          <span className="label">Recém-adicionados</span>
          <Link className="showcase__more" to="/biblioteca">
            Ver tudo
            <Icon name="arrowRight" size={16} />
          </Link>
        </header>

        <div
          className="showcase__stage"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            touchStart.current = null;
            if (start === null || !cycles) return;
            const delta = (event.changedTouches[0]?.clientX ?? start) - start;
            if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1);
          }}
        >
          {previous && (
            <button
              type="button"
              className="showcase__flank showcase__flank--left"
              onClick={() => go(-1)}
              aria-label={`Ver ${previous.title}`}
            >
              <MediaFrame content={previous} src={previous.thumbnail_url} />
            </button>
          )}
          {next && (
            <button
              type="button"
              className="showcase__flank showcase__flank--right"
              onClick={() => go(1)}
              aria-label={`Ver ${next.title}`}
            >
              <MediaFrame content={next} src={next.thumbnail_url} />
            </button>
          )}

          <div className="showcase__fade" aria-hidden="true" />

          <div
            className="showcase__feature"
            key={front.id}
            style={
              front.width && front.height
                ? { aspectRatio: String(front.width / front.height) }
                : undefined
            }
          >
            <button
              type="button"
              className="showcase__front"
              onClick={() => navigate(`/w/${front.id}`, { state: { background: location } })}
              aria-label={`Abrir ${front.title}`}
            >
              <MediaFrame content={front} src={front.thumbnail_url} priority natural />
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

          {cycles && (
            <>
              <button
                type="button"
                className="showcase__nav showcase__nav--prev"
                onClick={() => go(-1)}
                aria-label="Conteúdo anterior"
              >
                <Icon name="chevronLeft" size={20} />
              </button>
              <button
                type="button"
                className="showcase__nav showcase__nav--next"
                onClick={() => go(1)}
                aria-label="Próximo conteúdo"
              >
                <Icon name="chevronRight" size={20} />
              </button>
            </>
          )}
        </div>

        {cycles && (
          <p className="showcase__counter" aria-live={rotation.running ? "off" : "polite"}>
            {index + 1} / {total}
          </p>
        )}
      </div>
    </section>
  );
}
