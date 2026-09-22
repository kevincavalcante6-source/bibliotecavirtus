import { useCallback, useEffect, useRef, useState } from "react";
import { readableError } from "@/lib/supabase";

export type AsyncStatus = "loading" | "ready" | "error";

/**
 * Um único lugar para o trio carregando / erro / pronto que toda página usa,
 * com proteção contra resposta de requisição já substituída.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const ticket = useRef(0);

  // O loader muda a cada render das páginas; guardamos a referência atual e
  // disparamos apenas quando as dependências declaradas mudarem.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const current = ++ticket.current;
    setStatus("loading");
    setError(null);
    try {
      const result = await loaderRef.current();
      if (current !== ticket.current) return;
      setData(result);
      setStatus("ready");
    } catch (caught) {
      if (current !== ticket.current) return;
      setError(readableError(caught));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, status, error, reload: run };
}
