/**
 * iPhone e iPad. O iPadOS se apresenta como Mac, então o toque desempata.
 */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/**
 * No iPhone o download comum vai para o app Arquivos. O menu de compartilhar
 * do sistema tem "Salvar imagem", que manda direto para as Fotos — é o
 * caminho quando o navegador aceita compartilhar arquivos.
 */
export function savesToPhotosViaShare(): boolean {
  return (
    isAppleMobile() &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  );
}
