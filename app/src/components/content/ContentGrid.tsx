import { useEffect, useRef } from "react";
import { ContentCard } from "@/components/content/ContentCard";
import type { Content } from "@/types/models";

interface Props {
  items: Content[];
  widget?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function ContentGrid({ items, widget, hasMore, loadingMore, onLoadMore }: Props) {
  const sentinel = useRef<HTMLDivElement | null>(null);

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
          <ContentCard key={item.id} content={item} priority={index < 4} />
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
