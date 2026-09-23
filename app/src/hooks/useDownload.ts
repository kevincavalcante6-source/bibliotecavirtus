import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { useToast } from "@/components/feedback/ToastProvider";
import { registerDownload } from "@/services/downloads.service";
import { signedOriginalUrl } from "@/services/storage.service";
import { readableError } from "@/lib/supabase";
import { savesToPhotosViaShare } from "@/lib/device";
import { shareToPhotos } from "@/lib/shareToPhotos";
import type { PreparedFile } from "@/hooks/usePreparedOriginal";
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
 * recompressão e sem redimensionamento. No download comum o registro no banco
 * acontece antes do arquivo abrir; no iPhone, depois que a pessoa escolhe o
 * que fazer no menu — quem fecha o menu sem salvar não conta como download.
 */
export function useDownload(onCounted?: (contentId: string, total: number) => void) {
  const { session } = useAuth();
  const { notify, notifyError } = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const download = useCallback(
    async (content: Content, prepared?: PreparedFile | null) => {
      if (!session) {
        notify("Entre na sua conta para baixar.");
        navigate("/login", { state: { from: `/w/${content.id}` } });
        return;
      }

      setBusyId(content.id);
      try {
        if (savesToPhotosViaShare()) {
          const result = await shareToPhotos(prepared ? await prepared : null, fileNameFor(content));
          if (result === "cancelled") return;
          if (result === "shared") {
            onCounted?.(content.id, await registerDownload(content.id));
            return;
          }
        }

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
