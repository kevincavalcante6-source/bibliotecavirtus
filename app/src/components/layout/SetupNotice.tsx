/**
 * Sem as chaves do Supabase o app não tem backend — e falhar em silêncio seria
 * pior do que dizer exatamente o que falta.
 */
export function SetupNotice() {
  return (
    <div className="wrap" style={{ maxWidth: 640, paddingBlock: "var(--s-10)" }}>
      <div className="label label--accent">Biblioteca Virtus</div>
      <h1 style={{ marginTop: "var(--s-4)", fontSize: 32 }}>Configuração pendente</h1>
      <p className="lede" style={{ marginTop: "var(--s-4)" }}>
        O aplicativo precisa das credenciais do projeto Supabase para conversar com o banco, a
        autenticação e o storage.
      </p>

      <ol style={{ marginTop: "var(--s-6)", color: "var(--secondary)", lineHeight: 2, paddingLeft: 20 }}>
        <li>
          Crie um projeto em <code>supabase.com</code>.
        </li>
        <li>
          Rode <code>supabase/migrations/0001_init.sql</code> no SQL Editor do projeto.
        </li>
        <li>
          Copie <code>.env.example</code> para <code>.env.local</code> e preencha{" "}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
        </li>
        <li>
          Reinicie <code>npm run dev</code>.
        </li>
      </ol>
    </div>
  );
}
