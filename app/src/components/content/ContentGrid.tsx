import { useEffect, useMemo, useRef } from "react";
import { ContentCard } from "@/components/content/ContentCard";
import type { BrowseState } from "@/lib/browse";
import type { Content } from "@/types/models";

interface Props {
  items: Content[];
  widget?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  /** A lista é a coleção inteira em ordem (ver BrowseState.continues). */
  continues?: boolean;
}

export function ContentGrid({ items, widget, hasMore, loadingMore, onLoadMore, continues = false }: Props) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const browse = useMemo<BrowseState>(
    () => ({ ids: items.map((item) => item.id), continues }),
    [items, continues],
  );

  // Paginação por observador: a próxima página entra quando o rodapé da lista
  // se aproxima, sem botão e sem carregar tudo de uma vez.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, items.length]);

  return (
    <>
      <div className={`grid${widget ? " grid--widgets" : ""}`}>
        {items.map((item, index) => (
          <ContentCard key={item.id} content={item} priority={index < 4} browse={browse} />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinel} className="state state--inline" aria-live="polite">
          {loadingMore ? <div className="spinner" /> : <span className="label">Carregando mais</span>}
        </div>
      )}
    </>
  );
}
