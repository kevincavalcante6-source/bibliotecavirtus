import { useEffect, useRef } from "react";
import type { Content } from "@/types/models";

export type PreparedFile = Promise<File | null>;

/**
 * O menu de compartilhar do iPhone só abre em resposta direta ao toque: se o
 * arquivo ainda fosse buscado depois do toque, o sistema poderia recusar.
 * Por isso o original é trazido assim que o detalhe abre — a mesma URL que a
 * imagem já está carregando, então em geral vem do cache do navegador.
 *
 * `url` nula desliga a preparação (fora do iPhone, ou sem original ainda).
 */
export function usePreparedOriginal(content: Content | null, url: string | null) {
  const prepared = useRef<PreparedFile | null>(null);

  useEffect(() => {
    prepared.current = null;
    if (!content || !url) return;

    const controller = new AbortController();
    prepared.current = fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob) return null;
        const type = content.mime_type || blob.type || "image/png";
        const ext = type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        return new File([blob], `virtus-${content.id.slice(0, 8)}.${ext}`, { type });
      })
      .catch(() => null);

    return () => controller.abort();
  }, [content, url]);

  return prepared;
}
