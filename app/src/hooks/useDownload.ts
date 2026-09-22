import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { registerDownload } from "@/services/downloads.service";
import { signedOriginalUrl } from "@/services/storage.service";
import { readableError } from "@/lib/supabase";
import type { Content } from "@/types/models";

function fileNameFor(content: Content): string {
  const ext = content.file_url.split(".").pop() || "png";
  const slug = content.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `virtus-${slug || content.id.slice(0, 8)}.${ext}`;
}

/**
 * Entrega o arquivo original, íntegro: URL assinada do bucket privado, sem
 * recompressão e sem redimensionamento. O registro no banco acontece antes do
 * arquivo abrir, para que o histórico e o contador não dependam do navegador.
 */
export function useDownload(onCounted?: (contentId: string, total: number) => void) {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const download = useCallback(
    async (content: Content) => {
      if (!session) {
        notify("Entre na sua conta para baixar.");
        navigate("/login", { state: { from: `/w/${content.id}` } });
        return;
      }

      setBusyId(content.id);
      try {
        const total = await registerDownload(content.id);
        const url = await signedOriginalUrl(content.file_url, fileNameFor(content));
        onCounted?.(content.id, total);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileNameFor(content);
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        notify("Download iniciado em resolução original.");
      } catch (error) {
        notifyError(readableError(error, "Não foi possível baixar agora."));
      } finally {
        setBusyId(null);
      }
    },
    [session, navigate, notify, notifyError, onCounted],
  );

  return { download, busyId };
}
