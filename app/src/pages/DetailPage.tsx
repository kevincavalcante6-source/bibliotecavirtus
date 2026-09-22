import { useParams } from "react-router-dom";
import { ContentDetail } from "@/components/content/ContentDetail";

/** Acesso direto a /w/:id (link compartilhado, recarregar a página). */
export function DetailPage() {
  const { id = "" } = useParams();
  return <ContentDetail contentId={id} />;
}
