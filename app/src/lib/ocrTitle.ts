/**
 * Monta o título a partir das palavras que o OCR leu no wallpaper.
 * Separado do OCR em si para poder ser testado sem navegador.
 */

export interface ReadWord {
  text: string;
  /** 0–100, confiança do OCR */
  confidence: number;
}

/** Abaixo disso é ruído de foto (textura, roupa, objetos). */
const MIN_CONFIDENCE = 85;
const MAX_LENGTH = 120;

/** Palavras que continuam com maiúscula mesmo no meio da frase. */
const PROPER = new Map(
  ["deus", "cristo", "jesus", "espírito", "santo"].map((word) => [word, word[0].toUpperCase() + word.slice(1)]),
);

/**
 * Palavras do universo da marca. Serve só para desfazer trocas típicas de
 * leitura em letras gigantes (o "C" com sombra lido como "G"): uma palavra
 * lida só é corrigida se trocar uma letra "parecida" a transforma numa destas.
 */
const KNOWN = new Set([
  "cristo", "deus", "jesus", "senhor", "espírito", "santo", "fé", "força", "graça", "oração", "ore",
  "propósito", "disciplina", "foco", "constância", "coragem", "luta", "vitória", "caminho", "tempo",
  "silêncio", "ordem", "norte", "virtus", "mente", "ambiente", "levanto", "confie", "creia",
]);

const LOOKALIKE: Record<string, string[]> = {
  g: ["c"], c: ["g"], q: ["o"], o: ["q", "0"], "0": ["o"], l: ["i"], i: ["l"], "1": ["i", "l"], "5": ["s"], s: ["5"],
};

/** "gristo" → "cristo"; palavra que já existe ou sem troca possível fica como está. */
function fixLookalike(bare: string): string {
  if (bare.length < 4 || KNOWN.has(bare)) return bare;
  for (let i = 0; i < bare.length; i++) {
    for (const swap of LOOKALIKE[bare[i]] ?? []) {
      const candidate = bare.slice(0, i) + swap + bare.slice(i + 1);
      if (KNOWN.has(candidate)) return candidate;
    }
  }
  return bare;
}

/** Pontuação lida separada da palavra ("FOCO" "," "DISCIPLINA"). */
function isPunctuation(text: string): boolean {
  return /^[,.;:!?…]+$/u.test(text);
}

/** Palavra de verdade: ao menos uma letra; letra sozinha só se for palavra comum. */
function isWord(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length === 0) return false;
  if (letters.length === 1) return /^[aeoàéóAEOÀÉÓ]$/.test(letters);
  return true;
}

/** Quanto texto confiável a leitura trouxe — para escolher a melhor versão da imagem. */
export function readingScore(words: ReadWord[]): number {
  return keptWords(words)
    .filter((word) => isWord(word.text))
    .reduce((sum, word) => sum + word.text.length * word.confidence, 0);
}

function keptWords(words: ReadWord[]): ReadWord[] {
  return words
    .map((word) => ({ ...word, text: word.text.trim() }))
    .filter((word) => word.confidence >= MIN_CONFIDENCE && (isWord(word.text) || isPunctuation(word.text)));
}

/**
 * "CRISTO É MINHA FORÇA." → "Cristo é minha força". Sem texto confiável,
 * devolve null e o título continua vindo do nome do arquivo.
 */
export function titleFromWords(words: ReadWord[]): string | null {
  const kept = keptWords(words);
  if (!kept.some((word) => isWord(word.text))) return null;

  const lower = kept
    .map((word) => word.text.toLocaleLowerCase("pt-BR"))
    .map((word) => {
      const bare = word.replace(/[^\p{L}\d]/gu, "");
      const fixed = fixLookalike(bare);
      const corrected = fixed === bare ? word : word.replace(bare, fixed);
      const proper = PROPER.get(fixed);
      return proper ? corrected.replace(fixed, proper) : corrected;
    })
    .join(" ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:!?…]+/u, "")
    .trim()
    // Título sem ponto final; vírgulas e interrogações ficam.
    .replace(/[.…]+$/u, "")
    .trim();

  if (!lower) return null;
  const title = lower[0].toLocaleUpperCase("pt-BR") + lower.slice(1);
  return title.length > MAX_LENGTH ? title.slice(0, MAX_LENGTH).trimEnd() : title;
}
