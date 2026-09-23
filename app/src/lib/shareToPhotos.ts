export type ShareResult = "shared" | "cancelled" | "unavailable";

/**
 * iPhone: abre o menu de compartilhar do sistema com o arquivo original, onde
 * "Salvar imagem" guarda direto nas Fotos. Qualquer impedimento devolve
 * "unavailable" e quem chamou segue com o download comum — nunca fica pior
 * que antes. Fechar o menu sem escolher nada é "cancelled".
 */
export async function shareToPhotos(ready: File | null, fileName: string): Promise<ShareResult> {
  if (!ready) return "unavailable";

  const file = new File([ready], fileName, { type: ready.type });
  if (!navigator.canShare({ files: [file] })) return "unavailable";

  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    return (error as { name?: string }).name === "AbortError" ? "cancelled" : "unavailable";
  }
}
