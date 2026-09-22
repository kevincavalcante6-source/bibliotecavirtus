import { useCallback, useEffect, useRef, useState } from "react";
import { listContent, PAGE_SIZE } from "@/services/content.service";
import type { Content, ContentType } from "@/types/models";

export type FeedStatus = "loading" | "loading-more" | "ready" | "error";

interface FeedState {
  items: Content[];
  status: FeedStatus;
  error: string | null;
  hasMore: boolean;
  total: number;
}

const INITIAL: FeedState = { items: [], status: "loading", error: null, hasMore: false, total: 0 };

/**
 * Feed paginado com busca. Cada requisição carrega um ticket; respostas de
 * consultas antigas são descartadas, então digitar rápido não embaralha a lista.
 */
export function useContentFeed(type: ContentType | undefined, search: string) {
  const [state, setState] = useState<FeedState>(INITIAL);
  const pageRef = useRef(0);
  const ticketRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      const ticket = ++ticketRef.current;
      setState((current) => ({
        ...current,
        status: mode === "replace" ? "loading" : "loading-more",
        error: null,
      }));

      try {
        const result = await listContent({ type, search, page, pageSize: PAGE_SIZE });
        if (ticket !== ticketRef.current) return;
        pageRef.current = page;
        setState((current) => ({
          items: mode === "replace" ? result.items : [...current.items, ...result.items],
          status: "ready",
          error: null,
          hasMore: result.hasMore,
          total: result.total,
        }));
      } catch (error) {
        if (ticket !== ticketRef.current) return;
        setState((current) => ({
          ...current,
          status: "error",
          error: (error as { message?: string }).message ?? "Falha ao carregar a biblioteca.",
        }));
      }
    },
    [type, search],
  );

  useEffect(() => {
    void fetchPage(0, "replace");
  }, [fetchPage]);

  // O estado atual fica num ref para que loadMore não dispare efeito dentro de
  // um setState — em StrictMode isso carregaria a mesma página duas vezes.
  const stateRef = useRef(state);
  stateRef.current = state;

  const loadMore = useCallback(() => {
    const current = stateRef.current;
    if (current.status === "loading" || current.status === "loading-more" || !current.hasMore) return;
    void fetchPage(pageRef.current + 1, "append");
  }, [fetchPage]);

  const retry = useCallback(() => {
    void fetchPage(0, "replace");
  }, [fetchPage]);

  return { ...state, loadMore, retry };
}
