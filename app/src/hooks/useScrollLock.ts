import { useLayoutEffect } from "react";

/**
 * Trava o scroll da página de trás e devolve a posição exata ao sair.
 * O restauro acontece em useLayoutEffect, antes da pintura, então o usuário
 * não vê a lista voltar ao topo nem saltar.
 */
export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;

    const { body } = document;
    const offset = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${offset}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, offset);
    };
  }, [active]);
}
