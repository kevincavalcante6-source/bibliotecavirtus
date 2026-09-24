import type { Worker } from "tesseract.js";
import { readingScore, titleFromWords } from "@/lib/ocrTitle";
import type { ReadWord } from "@/lib/ocrTitle";

/**
 * Lê a frase escrita no wallpaper para sugerir o título no envio.
 *
 * Roda só no navegador de quem administra: o leitor (tesseract.js) e o
 * dicionário de português vêm do jsDelivr na primeira leitura e ficam em
 * cache. Quem só navega pela biblioteca nunca carrega nada disso.
 *
 * É sugestão: letras muito estilizadas às vezes saem trocadas, e o título
 * continua editável antes do envio.
 */

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      // Modo "texto solto": frases espalhadas pela arte, fora de um bloco.
      await worker.setParameters({ tessedit_pageseg_mode: "11" as never });
      return worker;
    })().catch((error) => {
      workerPromise = null;
      throw error;
    });
  }
  return workerPromise;
}

/** Libera a memória do leitor ao sair das telas de envio. */
export async function releaseOcr(): Promise<void> {
  const pending = workerPromise;
  workerPromise = null;
  if (pending) await (await pending).terminate().catch(() => undefined);
}

/** Maior lado usado na leitura — suficiente para as letras, sem pesar. */
const MAX_EDGE = 2000;

/**
 * Duas versões em preto e branco da mesma arte: uma para texto escuro sobre
 * fundo claro, outra para texto claro sobre fundo escuro (invertida). Só o
 * que é quase preto ou quase branco vira "letra"; foto e textura somem.
 */
async function binarizedVariants(file: File): Promise<HTMLCanvasElement[]> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const source = document.createElement("canvas");
  source.width = width;
  source.height = height;
  const ctx = source.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, width, height);

  const variant = (isText: (gray: number) => boolean) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const out = new ImageData(width, height);
    const src = pixels.data;
    const dst = out.data;
    for (let i = 0; i < src.length; i += 4) {
      const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
      const value = isText(gray) ? 0 : 255;
      dst[i] = dst[i + 1] = dst[i + 2] = value;
      dst[i + 3] = 255;
    }
    canvas.getContext("2d")!.putImageData(out, 0, 0);
    return canvas;
  };

  return [variant((gray) => gray < 85), variant((gray) => gray > 225)];
}

async function readWords(worker: Worker, canvas: HTMLCanvasElement): Promise<ReadWord[]> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  return (data.blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.words.map((word) => ({ text: word.text, confidence: word.confidence }))),
    ),
  );
}

/**
 * Limite por arquivo. A primeira leitura inclui baixar o leitor (alguns MB),
 * por isso é folgado; passou disso, segue sem sugestão e nada fica travado.
 */
const TIMEOUT_MS = 60_000;

/** Título sugerido pela frase da arte, ou null se não houver texto legível. */
export async function readTitle(file: File): Promise<string | null> {
  let timer = 0;
  const timeout = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), TIMEOUT_MS);
  });
  try {
    return await Promise.race([read(file), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function read(file: File): Promise<string | null> {
  try {
    const worker = await getWorker();
    const readings: ReadWord[][] = [];
    for (const canvas of await binarizedVariants(file)) readings.push(await readWords(worker, canvas));
    const best = readings.sort((a, b) => readingScore(b) - readingScore(a))[0];
    return best ? titleFromWords(best) : null;
  } catch {
    // Sem leitor (offline, bloqueio de rede): o título segue pelo nome do arquivo.
    return null;
  }
}
