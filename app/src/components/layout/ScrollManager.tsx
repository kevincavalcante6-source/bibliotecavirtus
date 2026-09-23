import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import type { Location } from "react-router-dom";

/** Posição de cada entrada do histórico, para o botão voltar devolver o lugar. */
const positions = new Map<string, number>();

const RESTORE_TIMEOUT_MS = 1500;

function hasBackground(location: Location | null) {
  return Boolean((location?.state as { background?: Location } | null)?.background);
}

/** O corpo fica fixo enquanto o detalhe está aberto; ali o scroll não é da página. */
function pageIsLocked() {
  return document.body.style.position === "fixed";
}

/**
 * Onde a página começa a cada navegação:
 * - ir para outra página → começa do topo;
 * - tocar de novo na aba em que já está → sobe suavemente até o topo;
 * - voltar/avançar do navegador → volta ao ponto em que a pessoa estava;
 * - abrir ou fechar o detalhe por cima da lista → nada aqui (useScrollLock cuida).
 */
export function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef<Location | null>(null);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    const key = location.key;
    function save() {
      if (!pageIsLocked()) positions.set(key, window.scrollY);
    }
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [location.key]);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = location;
    if (!before || before.key === location.key) return;

    if (hasBackground(location)) return;
    if (navigationType === "POP" && hasBackground(before)) return;

    if (navigationType === "POP") {
      return restore(positions.get(location.key) ?? 0);
    }

    const samePage = before.pathname === location.pathname && before.search === location.search;
    window.scrollTo({ top: 0, behavior: samePage ? "smooth" : "auto" });
  }, [location, navigationType]);

  return null;
}

/**
 * A lista pode ainda estar carregando quando a pessoa volta: os esqueletos
 * têm outra altura e as imagens chegam aos poucos. Por um instante a posição
 * é reafirmada a cada quadro — até a pessoa tocar, rolar ou usar o teclado.
 */
function restore(target: number) {
  const started = performance.now();
  let frame = 0;
  const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

  const stop = () => {
    cancelAnimationFrame(frame);
    events.forEach((name) => window.removeEventListener(name, stop));
  };
  events.forEach((name) => window.addEventListener(name, stop, { passive: true }));

  const hold = () => {
    if (Math.abs(window.scrollY - target) >= 1) window.scrollTo(0, target);
    if (performance.now() - started < RESTORE_TIMEOUT_MS) frame = requestAnimationFrame(hold);
    else stop();
  };
  hold();

  return stop;
}
