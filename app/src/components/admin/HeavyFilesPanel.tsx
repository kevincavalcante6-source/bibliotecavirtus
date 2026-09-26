import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/ToastProvider";
import { listHeavyContent, reoptimizeContent } from "@/services/library-admin.service";
import { formatBytes, plural } from "@/lib/format";
import type { Content } from "@/types/models";

type Phase = "idle" | "running" | "done";

/**
 * Arquivos já avaliados que ficaram como estavam (transparência ou sem ganho),
 * por id → caminho do arquivo. Assim o aviso não volta toda vez por causa
 * deles; se o arquivo for trocado, o caminho muda e ele é avaliado de novo.
 */
const CHECKED_KEY = "virtus.admin.optimize-checked";

function readChecked(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CHECKED_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function writeChecked(checked: Record<string, string>) {
  try {
    localStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
  } catch {
    /* sem armazenamento: o aviso só volta a aparecer */
  }
}

/**
 * Aviso no acervo quando há originais pesados, com a otimização em lote:
 * um arquivo por vez, mostrando o avanço e quanto espaço foi economizado.
 */
export function HeavyFilesPanel({ onUpdated }: { onUpdated: (content: Content) => void }) {
  const { notifyError } = useToast();
  const [heavy, setHeavy] = useState<Content[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [position, setPosition] = useState(0);
  const [totals, setTotals] = useState({ before: 0, after: 0, converted: 0, transparent: 0, notSmaller: 0, failed: 0 });

  useEffect(() => {
    listHeavyContent()
      .then((items) => {
        const checked = readChecked();
        setHeavy(items.filter((item) => checked[item.id] !== item.file_url));
      })
      .catch(() => setHeavy([]));
  }, []);

  if (!heavy || (heavy.length === 0 && phase !== "done")) return null;

  const totalBytes = heavy.reduce((sum, item) => sum + (item.file_size ?? 0), 0);

  async function run() {
    if (!heavy) return;
    setPhase("running");
    const sum = { before: 0, after: 0, converted: 0, transparent: 0, notSmaller: 0, failed: 0 };
    const checked = readChecked();
    for (let i = 0; i < heavy.length; i++) {
      setPosition(i + 1);
      try {
        const result = await reoptimizeContent(heavy[i]);
        sum.before += result.before;
        sum.after += result.after;
        if (result.outcome === "converted") {
          sum.converted += 1;
          onUpdated(result.content);
        } else {
          if (result.outcome === "transparent") sum.transparent += 1;
          else sum.notSmaller += 1;
          checked[result.content.id] = result.content.file_url;
          writeChecked(checked);
        }
      } catch {
        sum.failed += 1;
        sum.before += heavy[i].file_size ?? 0;
        sum.after += heavy[i].file_size ?? 0;
      }
      setTotals({ ...sum });
    }
    setPhase("done");
    if (sum.failed > 0) notifyError(`${plural(sum.failed, "arquivo não pôde ser otimizado", "arquivos não puderam ser otimizados")}. Tente de novo.`);
  }

  if (phase === "done") {
    return (
      <div className="notice notice--success heavy-panel heavy-panel--done">
        <Icon name="check" size={16} />
        <span>
          Pronto: {formatBytes(totals.before)} → <b>{formatBytes(totals.after)}</b>.{" "}
          {plural(totals.converted, "arquivo otimizado", "arquivos otimizados")}
          {totals.notSmaller > 0 &&
            `, ${plural(totals.notSmaller, "mantido porque já estava bem comprimido", "mantidos porque já estavam bem comprimidos")}`}
          {totals.transparent > 0 &&
            `, ${plural(totals.transparent, "mantido por ter transparência", "mantidos por terem transparência")}`}
          {totals.failed > 0 && `, ${plural(totals.failed, "com erro", "com erro")}`}.
        </span>
      </div>
    );
  }

  return (
    <div className="notice notice--warn heavy-panel">
      <div>
        <b>{plural(heavy.length, "arquivo pesado", "arquivos pesados")}</b> ocupando {formatBytes(totalBytes)}. Otimizar
        converte para JPG de alta qualidade na mesma resolução — ocupa bem menos espaço e tráfego. Arquivos com
        transparência ficam como estão.
      </div>
      <button type="button" className="btn btn--secondary btn--sm" onClick={() => void run()} disabled={phase === "running"}>
        {phase === "running" ? `Otimizando ${position} de ${heavy.length}…` : "Otimizar agora"}
      </button>
    </div>
  );
}
