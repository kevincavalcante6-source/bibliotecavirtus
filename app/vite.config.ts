import { defineConfig } from "vite";
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
export default defineConfig(({ mode }) => {
  const demo = mode === "demo";

  return {
    plugins: [react()],
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
