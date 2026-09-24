# Biblioteca Virtus — aplicação

React + TypeScript + Vite no cliente, Supabase (Postgres, Auth e Storage) no servidor.

## Rodando localmente

```bash
cd app
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto
npm run dev
```

Sem as variáveis preenchidas o app abre uma tela dizendo exatamente o que falta,
em vez de quebrar em silêncio.

## Preparando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole o arquivo **`supabase/setup-completo.sql`** inteiro
   e rode uma vez. Ele junta as migrações de `supabase/migrations/` na ordem
   certa, dentro de uma transação (se algo falhar, nada fica pela metade):
   `0001_init.sql` cria as tabelas, as políticas de RLS, as funções e os dois
   buckets de storage; `0002_downloads_history.sql` permite que cada pessoa
   tire itens do próprio histórico sem afetar a contagem;
   `0003_access_control.sql` restringe a biblioteca a quem comprou;
   `0004_visits.sql` guarda a visita anterior de cada pessoa, para o selo "Novo".
   Se uma migração mudar, gere o arquivo de novo com `supabase/gerar-setup.sh`.
3. Em **Project Settings → API**, copie `Project URL` e `anon public` para
   `.env.local`.
4. Crie sua conta pelo próprio app (`/cadastro`) e depois promova-a a
   administrador no SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'voce@exemplo.com';
   ```

   O papel só muda por SQL ou pela `service_role`: o cliente não tem privilégio
   de escrita nessa coluna.

5. Em **Authentication → Providers → Email**, mantenha **Confirm email
   ligado**. Não é opcional: o acesso é liberado pelo e-mail da compra, e só
   um e-mail confirmado conta. Com a confirmação desligada, qualquer pessoa
   poderia criar conta com o e-mail de um comprador e herdar o acesso dele.

## Acesso por compra (Cakto)

A biblioteca é exclusiva de quem comprou. O fluxo:

1. A pessoa compra na Cakto.
2. A Cakto avisa a função `cakto-webhook`, que libera o e-mail do comprador
   na tabela `entitlements`. Reembolso e chargeback revogam.
3. A pessoa recebe o e-mail da Cakto com o link do site, cria a conta **com o
   mesmo e-mail da compra**, confirma o endereço e entra.

Quem entra sem compra aprovada vê uma tela explicando o que fazer, e o banco
recusa todo o conteúdo — a proteção é das políticas de RLS, não da tela.

### Configurando

1. **Publique a função** com a verificação de JWT desligada (a Cakto não envia
   token do Supabase; a autenticação é o segredo no corpo):

   ```bash
   supabase functions deploy cakto-webhook --no-verify-jwt
   ```

   Pelo painel também dá: **Edge Functions → Deploy a new function**, colando
   `index.ts` e `handler.ts`, e desligando *Enforce JWT verification*.

2. **Segredos** em **Edge Functions → Secrets**:
   - `CAKTO_WEBHOOK_SECRET` — o mesmo segredo que você cadastrar no webhook
     da Cakto.
   - `CAKTO_PRODUCT_IDS` — opcional. Se a sua conta Cakto vende outros
     produtos, liste aqui os ids que dão acesso à biblioteca, separados por
     vírgula. Vazio, qualquer produto da conta libera.

3. **Na Cakto**, crie o webhook apontando para
   `https://SEU-PROJETO.supabase.co/functions/v1/cakto-webhook`, com os
   eventos **Compra aprovada**, **Reembolso** e **Chargeback**.

4. **Teste antes de vender.** Use o envio de teste da Cakto e confira a tabela
   `cakto_events` no Supabase. A coluna `outcome` diz o que aconteceu:

   | outcome | significado |
   | --- | --- |
   | `granted` | acesso liberado |
   | `revoked` | acesso revogado (reembolso ou chargeback) |
   | `no_email` | o e-mail não foi encontrado no evento — veja abaixo |
   | `other_product` | produto fora de `CAKTO_PRODUCT_IDS` |
   | `ignored_event` | evento que não mexe em acesso |

   O evento chega cru na coluna `payload`. Se aparecer `no_email`, o e-mail
   veio num campo que a função ainda não procura: o caminho esperado é
   `data.customer.email`, e a lista de alternativas está em `handler.ts`.

### Exceções pelo SQL Editor

Liberar alguém à mão (cortesia, e-mail digitado errado na compra):

```sql
insert into public.entitlements (email, status, source)
values ('pessoa@exemplo.com', 'active', 'manual')
on conflict (email) do update set status = 'active', revoked_at = null;
```

Revogar:

```sql
update public.entitlements set status = 'revoked', revoked_at = now()
where email = 'pessoa@exemplo.com';
```

O e-mail vai sempre em minúsculas.

## Publicando na Vercel

1. **Add New Project** → importe o repositório.
2. **Root Directory**: `app` (o projeto não está na raiz do repositório).
   A Vercel detecta o Vite sozinha: build `npm run build`, saída `dist`.
3. **Environment Variables**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`,
   os mesmos valores do `.env.local`, e `VITE_SITE_URL` com o endereço
   público do site (ex.: `https://biblioteca.virtusmind.com`, sem barra no
   fim). Ele entra nas tags de prévia do link: sem ele o WhatsApp mostra
   título e descrição, mas não a imagem. Se o domínio mudar, atualize e faça
   um novo deploy.
4. Depois do primeiro deploy, no Supabase, em **Authentication → URL
   Configuration**: coloque o domínio da Vercel em *Site URL* e adicione
   `https://SEU-DOMINIO/**` em *Redirect URLs*. Sem isso, os links de
   confirmação e de recuperação de senha que chegam por e-mail apontam para
   `localhost`.

O `vercel.json` já cuida das rotas: sem ele, abrir direto `/biblioteca` ou
recarregar qualquer página que não seja a inicial devolveria 404. Ele também
define cache longo para os arquivos com hash em `/assets` e três cabeçalhos
de segurança básicos.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck + build de produção |
| `npm run preview` | serve o build |
| `npm run typecheck` | só a checagem de tipos |
| `npm run test:webhook` | testes da lógica do webhook da Cakto |

## Organização

```
src/
  auth/         AuthProvider (sessão real) e guardas de rota
  components/   layout, conteúdo, estados e feedback
  hooks/        feed paginado, favoritos, download, fila de upload
  lib/          cliente Supabase, formatação, arquivos
  pages/        uma pasta por área (públicas, auth, admin)
  services/     toda conversa com o banco e o storage
  styles/       tokens do design system e estilos
supabase/
  migrations/   esquema, RLS, funções e buckets
```

Regra de dependência: `pages` → `hooks` → `services` → `lib`. Nenhum componente
chama o Supabase diretamente.

## Segurança

O frontend não decide permissão. Quem decide:

- **RLS** em `profiles`, `content`, `favorites` e `downloads`.
- **Privilégio de coluna**: `role` e `email` não são atualizáveis pelo cliente;
  `download_count` também não.
- **Políticas de storage**: escrita nos dois buckets só para admin; o bucket dos
  originais é privado e entrega por URL assinada de 60 segundos.
- **Funções `SECURITY DEFINER`**: `register_download` registra e incrementa numa
  transação; `admin_stats` recusa quem não é admin, mesmo chamada direto na API.

Esconder o menu Admin é conveniência. A recusa acontece no banco.

## Integridade do arquivo

O original sobe exatamente como veio — sem recompressão, sem resize — para o
bucket privado. A prévia leve (WebP, borda maior de 800px) é gerada à parte e
vai para o bucket público, usada só nas listagens. Na interface, toda imagem usa
`object-fit: contain` sobre um fundo feito da própria imagem ampliada, desfocada
e escurecida: nada é cortado, esticado ou deformado.
