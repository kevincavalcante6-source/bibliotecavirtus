import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readImageSize, sha256, titleFromFilename, validateImage } from "@/lib/files";
import type { ImageSize } from "@/lib/files";
import { DuplicateError, uploadContentFile } from "@/services/upload.service";
import { readableError } from "@/lib/supabase";
import { readTitle, releaseOcr } from "@/lib/ocr";
import type { ContentType } from "@/types/models";

/** Limite por operação — não é limite semanal nem total. */
export const MAX_FILES_PER_BATCH = 35;
const CONCURRENCY = 3;

export type ItemStatus = "pending" | "uploading" | "done" | "error" | "duplicate";

export interface QueueItem {
  id: string;
  file: File;
  title: string;
  status: ItemStatus;
  progress: number;
  error?: string;
  previewUrl: string;
  /** Lido na hora de entrar na fila — base do aviso de formato. */
  size: ImageSize | null;
  /** Lendo a frase da arte para sugerir o título. */
  reading: boolean;
  /** Título mexido à mão: a leitura automática não sobrescreve. */
  titleEdited: boolean;
}

let sequence = 0;

export function useUploadQueue(type: ContentType) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef<QueueItem[]>([]);
  itemsRef.current = items;
  const readQueue = useRef<{ id: string; file: File }[]>([]);
  const draining = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      readQueue.current = [];
      void releaseOcr();
    };
  }, []);

  /**
   * Um arquivo por vez: a leitura é pesada e roda no navegador. Os títulos
   * vão aparecendo na fila enquanto você confere os primeiros.
   */
  const drainReads = useCallback(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      while (mounted.current && readQueue.current.length > 0) {
        const next = readQueue.current.shift()!;
        const title = await readTitle(next.file);
        if (!mounted.current) return;
        setItems((current) =>
          current.map((item) =>
            item.id !== next.id
              ? item
              : { ...item, reading: false, title: title && !item.titleEdited ? title : item.title },
          ),
        );
      }
    } finally {
      draining.current = false;
    }
  }, []);

  const patch = useCallback((id: string, changes: Partial<QueueItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const addFiles = useCallback(
    async (files: File[]): Promise<string | null> => {
      const room = MAX_FILES_PER_BATCH - itemsRef.current.length;
      if (room <= 0) return `A fila já tem ${MAX_FILES_PER_BATCH} arquivos. Envie esta leva primeiro.`;

      const accepted = files.slice(0, room);
      const overflow = files.length - accepted.length;

      // Duplicidade dentro da própria seleção, antes de qualquer upload.
      const seen = new Set<string>();
      await Promise.all(
        itemsRef.current.map(async (item) => {
          seen.add(await sha256(item.file));
        }),
      );

      const next: QueueItem[] = [];
      for (const file of accepted) {
        const invalid = validateImage(file);
        const hash = invalid ? null : await sha256(file);
        const duplicated = hash !== null && seen.has(hash);
        const size = invalid ? null : await readImageSize(file).catch(() => null);
        if (hash) seen.add(hash);

        next.push({
          id: `q${++sequence}`,
          file,
          title: titleFromFilename(file.name),
          status: invalid ? "error" : duplicated ? "duplicate" : "pending",
          progress: 0,
          error: invalid ?? (duplicated ? "Arquivo repetido nesta seleção." : undefined),
          previewUrl: URL.createObjectURL(file),
          size,
          reading: !invalid && !duplicated,
          titleEdited: false,
        });
      }

      setItems((current) => [...current, ...next]);
      readQueue.current.push(...next.filter((item) => item.reading).map((item) => ({ id: item.id, file: item.file })));
      void drainReads();
      return overflow > 0
        ? `${overflow} arquivo(s) ficaram de fora: o limite é ${MAX_FILES_PER_BATCH} por operação.`
        : null;
    },
    [drainReads],
  );

  const setTitle = useCallback((id: string, title: string) => patch(id, { title, titleEdited: true }), [patch]);

  const remove = useCallback((id: string) => {
    readQueue.current = readQueue.current.filter((entry) => entry.id !== id);
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clearFinished = useCallback(() => {
    setItems((current) => {
      current.filter((item) => item.status === "done").forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return current.filter((item) => item.status !== "done");
    });
  }, []);

  const uploadOne = useCallback(
    async (item: QueueItem) => {
      patch(item.id, { status: "uploading", progress: 0, error: undefined });
      try {
        await uploadContentFile({
          file: item.file,
          title: item.title,
          type,
          onProgress: (ratio) => patch(item.id, { progress: ratio }),
        });
        patch(item.id, { status: "done", progress: 1 });
      } catch (error) {
        if (error instanceof DuplicateError) {
          patch(item.id, { status: "duplicate", error: error.message, progress: 0 });
        } else {
          patch(item.id, { status: "error", error: readableError(error), progress: 0 });
        }
      }
    },
    [patch, type],
  );

  /** Envia a fila com paralelismo limitado, para não saturar a conexão. */
  const start = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      const queue = itemsRef.current.filter((item) => item.status === "pending");
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        while (cursor < queue.length) {
          const item = queue[cursor++];
          if (item) await uploadOne(item);
        }
      });
      await Promise.all(workers);
    } finally {
      setRunning(false);
    }
  }, [running, uploadOne]);

  const retry = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item) return;
      await uploadOne({ ...item, status: "pending", progress: 0 });
    },
    [uploadOne],
  );

  const summary = useMemo(() => {
    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    const sentBytes = items.reduce((sum, item) => sum + item.file.size * item.progress, 0);
    return {
      total: items.length,
      pending: items.filter((item) => item.status === "pending").length,
      done: items.filter((item) => item.status === "done").length,
      failed: items.filter((item) => item.status === "error").length,
      duplicated: items.filter((item) => item.status === "duplicate").length,
      reading: items.filter((item) => item.reading).length,
      overall: totalBytes === 0 ? 0 : sentBytes / totalBytes,
    };
  }, [items]);

  return { items, running, summary, addFiles, setTitle, remove, clearFinished, start, retry };
}
