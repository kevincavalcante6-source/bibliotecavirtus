import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { registerDownload } from "@/demo/services";
import type { Content } from "@/types/models";

/**
 * MODO DEMONSTRAÇÃO — o artefato roda em sandbox e bloqueia qualquer download
 * iniciado pela página. Para dar o que testar, aqui o botão registra o download
 * (o contador sobe de verdade) e abre a imagem numa aba nova, de onde dá para
 * salvar pelo próprio navegador. Se a sandbox bloquear também a aba, o aviso
 * diz exatamente isso em vez de falhar calado.
 *
 * Na aplicação conectada quem responde é `src/hooks/useDownload.ts`: URL
 * assinada do bucket privado e o arquivo original baixando direto.
 */
export function useDownload(onCounted?: (contentId: string, total: number) => void) {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const download = useCallback(
    // O segundo argumento (arquivo preparado para o iPhone) não se aplica aqui.
    async (content: Content, _prepared?: unknown) => {
      if (!session) {
        notify("Entre na sua conta para baixar.");
        navigate("/login", { state: { from: `/w/${content.id}` } });
        return;
      }

      setBusyId(content.id);
      try {
        const total = await registerDownload(content.id);
        onCounted?.(content.id, total);

        const aba = window.open(content.file_url, "_blank", "noopener,noreferrer");
        if (aba) {
          notify("Aberto em outra aba — salve por lá para testar o arquivo.");
        } else {
          notify("A demonstração não pode baixar arquivos; no app conectado o download é direto.");
        }
      } catch (error) {
        notifyError((error as { message?: string }).message ?? "Não foi possível baixar agora.");
      } finally {
        setBusyId(null);
      }
    },
    [session, navigate, notify, notifyError, onCounted],
  );

  return { download, busyId };
}
