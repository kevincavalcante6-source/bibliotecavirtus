import type { ImageSize } from "@/lib/files";

/** Diferença de proporção tolerada antes de avisar (2%). */
const TOLERANCE = 0.02;

export interface AspectStandard {
  /** altura ÷ largura */
  ratio: number;
  /** "9 : 16", "9 : 19,5"… */
  label: string;
  /** quantos arquivos seguem o padrão, de quantos */
  count: number;
  total: number;
}

/** Proporção em "9 : X", com X arredondado a meio ponto e vírgula decimal. */
export function ratioLabel({ width, height }: ImageSize): string {
  const x = Math.round(((9 * height) / width) * 2) / 2;
  return `9 : ${String(x).replace(".", ",")}`;
}

export function sameFormat(a: ImageSize, b: { ratio: number }): boolean {
  const ratio = a.height / a.width;
  return Math.abs(ratio - b.ratio) / b.ratio <= TOLERANCE;
}

/**
 * O padrão é o formato mais comum entre os arquivos. Sem nenhum arquivo, não
 * há padrão — e nada a avisar.
 */
export function standardOf(sizes: ImageSize[]): AspectStandard | null {
  const valid = sizes.filter((size) => size.width > 0 && size.height > 0);
  if (valid.length === 0) return null;

  const groups = new Map<string, ImageSize[]>();
  for (const size of valid) {
    const label = ratioLabel(size);
    groups.set(label, [...(groups.get(label) ?? []), size]);
  }
  const [label, members] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  const ratio = members.reduce((sum, size) => sum + size.height / size.width, 0) / members.length;
  return { ratio, label, count: members.length, total: valid.length };
}
