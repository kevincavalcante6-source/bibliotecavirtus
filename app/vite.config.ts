import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const src = fileURLToPath(new URL("./src", import.meta.url));
const at = (path: string) => `${src}/${path}`;

/**
 * O modo `demo` gera uma build sem servidor (publicada como artefato para
 * navegação): as mesmas páginas e componentes, com a camada de serviços e a
 * autenticação trocadas por implementações locais. A build padrão não conhece
 * nada disso.
 */
/**
 * Endereço público do site nas tags de prévia do link (og:image, og:url).
 * O WhatsApp ignora imagem com caminho relativo, então em produção
 * VITE_SITE_URL (ex.: https://biblioteca.virtusmind.com) precisa estar
 * definido na Vercel. Sem ele, o caminho fica relativo: título e descrição
 * aparecem, a imagem não.
 */
function siteUrl(url: string | undefined): Plugin {
  const base = (url ?? "").trim().replace(/\/+$/, "");
  return {
    name: "site-url",
    transformIndexHtml: (html) => html.replaceAll("%SITE_URL%", base),
  };
}

export default defineConfig(({ mode }) => {
  const demo = mode === "demo";
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    plugins: [react(), siteUrl(env.VITE_SITE_URL)],
    resolve: {
      alias: [
        ...(demo
          ? [
              { find: /^@\/services\/.*$/, replacement: at("demo/services.ts") },
              { find: "@/lib/supabase", replacement: at("demo/supabase.ts") },
              { find: "@/auth/AuthProvider", replacement: at("demo/auth.tsx") },
              { find: "@/hooks/useDownload", replacement: at("demo/useDownload.ts") },
            ]
          : []),
        { find: "@", replacement: src },
      ],
    },
    build: demo
      ? { outDir: "dist-demo", rollupOptions: { input: fileURLToPath(new URL("./demo.html", import.meta.url)) } }
      : {},
    server: { port: 5173 },
  };
});
