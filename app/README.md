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
2. No **SQL Editor**, rode `supabase/migrations/0001_init.sql` inteiro. Ele cria
   as tabelas, as políticas de RLS, as funções e os dois buckets de storage.
3. Em **Project Settings → API**, copie `Project URL` e `anon public` para
   `.env.local`.
4. Crie sua conta pelo próprio app (`/cadastro`) e depois promova-a a
   administrador no SQL Editor:

   ```sql
   update public.profiles set role = 'admin' where email = 'voce@exemplo.com';
   ```

   O papel só muda por SQL ou pela `service_role`: o cliente não tem privilégio
   de escrita nessa coluna.

5. Opcional, para desenvolvimento: em **Authentication → Providers → Email**,
   desligue *Confirm email* para entrar sem confirmar o endereço.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | typecheck + build de produção |
| `npm run preview` | serve o build |
| `npm run typecheck` | só a checagem de tipos |

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
