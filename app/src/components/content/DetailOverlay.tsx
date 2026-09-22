import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ContentDetail } from "@/components/content/ContentDetail";
import { useScrollLock } from "@/hooks/useScrollLock";

/**
 * Detalhe aberto por cima da listagem. A página de trás continua montada, e o
 * fechamento (botão, Esc, clique fora ou o botão voltar do navegador) devolve
 * a posição de scroll exata — sem voltar ao topo, sem salto.
 */
export function DetailOverlay() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const backdrop = useRef<HTMLDivElement | null>(null);

  useScrollLock(true);

  const close = useCallback(() => navigate(-1), [navigate]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <div
      className="overlay"
      ref={backdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhe do conteúdo"
      onMouseDown={(event) => {
        if (event.target === backdrop.current) close();
      }}
    >
      <div className="overlay__panel">
        <ContentDetail contentId={id} onClose={close} />
      </div>
    </div>
  );
}
