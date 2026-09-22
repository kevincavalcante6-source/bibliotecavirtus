import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  enabled: boolean;
  intervalMs?: number;
  onAdvance: () => void;
}

/**
 * Rotação automática discreta, para a vitrine avançar sozinha sem virar
 * animação constante. Ela só corre quando faz sentido correr:
 *
 * - para enquanto o ponteiro ou o foco estão sobre a seção;
 * - para quando a seção sai da tela ou a aba perde o foco;
 * - encerra de vez assim que a pessoa assume o controle;
 * - nunca começa para quem pediu menos movimento no sistema.
 */
export function useAutoRotate<T extends HTMLElement>({
  enabled,
  intervalMs = 6000,
  onAdvance,
}: Options) {
  const containerRef = useRef<T | null>(null);
  const [stopped, setStopped] = useState(false);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabActive, setTabActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const advance = useRef(onAdvance);
  advance.current = onAdvance;

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
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const running = enabled && !stopped && !paused && onScreen && tabActive && !reducedMotion;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => advance.current(), intervalMs);
    return () => window.clearInterval(timer);
  }, [running, intervalMs]);

  return {
    containerRef,
    running,
    pause: useCallback(() => setPaused(true), []),
    resume: useCallback(() => setPaused(false), []),
    stop: useCallback(() => setStopped(true), []),
  };
}
