import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  enabled: boolean;
  intervalMs?: number;
  /** Quanto tempo a rotação espera depois que a pessoa mexe na seção. */
  holdMs?: number;
  onAdvance: () => void;
}

/**
 * Rotação automática discreta, para a vitrine avançar sozinha sem virar
 * animação constante. Ela só corre quando faz sentido correr:
 *
 * - para enquanto o ponteiro está sobre a seção;
 * - para quando a seção sai da tela ou a aba perde o foco;
 * - recua por alguns segundos quando a pessoa navega ou foca algo ali, e
 *   depois retoma sozinha — quem quiser parar de vez é só deixar o ponteiro
 *   em cima;
 * - nunca começa para quem pediu menos movimento no sistema.
 */
export function useAutoRotate<T extends HTMLElement>({
  enabled,
  intervalMs = 3000,
  holdMs = 9000,
  onAdvance,
}: Options) {
  const containerRef = useRef<T | null>(null);
  const [held, setHeld] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabActive, setTabActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const advance = useRef(onAdvance);
  advance.current = onAdvance;
  const holdTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setTabActive(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const hold = useCallback(() => {
    setHeld(true);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setHeld(false), holdMs);
  }, [holdMs]);

  const running = enabled && !held && !hovered && onScreen && tabActive && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => advance.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [running, intervalMs]);

  return {
    containerRef,
    running,
    hold,
    enter: useCallback(() => setHovered(true), []),
    leave: useCallback(() => setHovered(false), []),
  };
}
