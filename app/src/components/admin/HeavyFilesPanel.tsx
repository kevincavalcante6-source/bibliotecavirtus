import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/feedback/ToastProvider";
import { listHeavyContent, reoptimizeContent } from "@/services/library-admin.service";
import { formatBytes, plural } from "@/lib/format";
import type { Content } from "@/types/models";

type Phase = "idle" | "running" | "done";

/**
 * Aviso no acervo quando há originais pesados, com a otimização em lote:
 * um arquivo por vez, mostrando o avanço e quanto espaço foi economizado.
 */
export function HeavyFilesPanel({ onUpdated }: { onUpdated: (content: Content) => void }) {
  const { notifyError } = useToast();
  const [heavy, setHeavy] = useState<Content[] | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [position, setPosition] = useState(0);
  const [totals, setTotals] = useState({ before: 0, after: 0, converted: 0, kept: 0, failed: 0 });

  useEffect(() => {
    listHeavyContent()
      .then(setHeavy)
      .catch(() => setHeavy([]));
  }, []);

  if (!heavy || (heavy.length === 0 && phase !== "done")) return null;

  const totalBytes = heavy.reduce((sum, item) => sum + (item.file_size ?? 0), 0);

  async function run() {
    if (!heavy) return;
    setPhase("running");
    const sum = { before: 0, after: 0, converted: 0, kept: 0, failed: 0 };
    for (let i = 0; i < heavy.length; i++) {
      setPosition(i + 1);
      try {
        const result = await reoptimizeContent(heavy[i]);
        sum.before += result.before;
        sum.after += result.after;
        if (result.outcome === "converted") {
          sum.converted += 1;
          onUpdated(result.content);
        } else sum.kept += 1;
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
          {totals.kept > 0 && `, ${plural(totals.kept, "mantido", "mantidos")} como estava (transparência ou sem ganho)`}
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
