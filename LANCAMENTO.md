# Lançamento — o que fazer fora do código

Tudo o que precisa ser configurado em **GitHub, Supabase, Vercel e Cakto** para a
Biblioteca Virtus ir ao ar sem erro. Siga **na ordem**: várias etapas dependem
da anterior (por exemplo, o endereço da Vercel precisa existir antes de
configurar os links de e-mail do Supabase).

Os detalhes técnicos de cada passo estão em [`app/README.md`](app/README.md).
Em qualquer etapa, é só chamar que fazemos juntos.

---

## 1. Código no GitHub

- [x] O código está na branch `claude/biblioteca-virtus-positioning-1ozo0c`, que
      hoje é a **única e principal** branch do repositório. A Vercel publica a
      partir dela — nada a fazer aqui.

## 2. Supabase — banco de dados

- [ ] Criar o projeto em [supabase.com](https://supabase.com). Anotar a senha do
      banco num lugar seguro.
- [ ] **SQL Editor → New query:** colar o arquivo
      [`supabase/setup-completo.sql`](supabase/setup-completo.sql) **inteiro** e
      clicar em **Run**, uma vez só. Ele já traz as 4 partes do banco na ordem
      certa. Se aparecer erro, nada fica pela metade — me mande o print.
- [ ] **Project Settings → API:** copiar `Project URL` e a chave `anon public`
      (vão para a Vercel no passo 3).
- [ ] **Authentication → Providers → Email:** conferir que **Confirm email está
      LIGADO**. ⚠️ Obrigatório: sem isso, qualquer pessoa poderia criar conta com
      o e-mail de um comprador e usar o acesso dele.
- [ ] Conferir os limites do plano (armazenamento e tráfego de download) e se o
      plano gratuito pausa o projeto por falta de uso — melhor saber antes de vender.

## 3. Vercel — publicar o site

- [ ] **Add New Project** → importar o repositório `bibliotecavirtus`.
- [ ] **Root Directory:** `app` ⚠️ (o site não está na raiz do repositório).
- [ ] **Environment Variables** (as três):
  - [ ] `VITE_SUPABASE_URL` → o `Project URL` do Supabase
  - [ ] `VITE_SUPABASE_ANON_KEY` → a chave `anon public`
  - [ ] `VITE_SITE_URL` → o endereço do site, **sem barra no fim**
        (ex.: `https://bibliotecavirtus.vercel.app`). É o que faz a imagem
        aparecer na prévia do WhatsApp.
- [ ] Fazer o deploy e abrir o site: deve aparecer a tela de login.
- [ ] *(Opcional)* Domínio próprio em **Settings → Domains**. Se usar, atualizar
      `VITE_SITE_URL` com o domínio novo, fazer **novo deploy** e repetir o
      passo 4.1 com o domínio novo.

## 4. Supabase — e-mails e links

### 4.1 Links dos e-mails
- [ ] **Authentication → URL Configuration:**
  - [ ] *Site URL* → o endereço do site na Vercel
  - [ ] *Redirect URLs* → adicionar `https://SEU-ENDERECO/**`

  ⚠️ Sem isso, os links de confirmação de conta e de nova senha levam para
  `localhost` e não funcionam.

### 4.2 Envio de e-mail de verdade (SMTP)
- [ ] Configurar um **SMTP próprio** em **Authentication → SMTP Settings**
      (por exemplo, Resend, Brevo ou o provedor do seu e-mail).
      ⚠️ O envio padrão do Supabase é só para testes e tem limite muito baixo
      por hora: com várias vendas no mesmo dia, compradores ficariam sem o
      e-mail de confirmação e não conseguiriam entrar.
- [ ] Usar um remetente com a sua marca (ex.: `acesso@seudominio.com`).

### 4.3 Textos dos e-mails em português
- [ ] **Authentication → Email Templates:** colar os modelos prontos da pasta
      [`supabase/email-templates/`](supabase/email-templates/) — *Confirm signup*
      e *Reset Password*, com os assuntos indicados no `LEIA-ME.md` de lá.

## 5. Sua conta de administrador e o conteúdo

- [ ] Criar a sua conta pelo próprio site, em `/cadastro`, e confirmar o e-mail.
- [ ] No **SQL Editor**, tornar a sua conta administradora:
      ```sql
      update public.profiles set role = 'admin' where email = 'SEU-EMAIL';
      ```
- [ ] Entrar de novo: o menu **Admin** aparece.
- [ ] Subir os wallpapers e widgets reais pelo **Admin** (envio em massa: até
      35 arquivos por vez). Manter todos os wallpapers no **mesmo formato**
      (hoje, 9 : 16).
- [ ] Conferir os títulos na fila antes de enviar: eles vêm da frase escrita
      em cada arte (a leitura baixa o leitor na primeira vez — alguns segundos).
      Letras muito estilizadas podem sair trocadas; é só tocar no título e corrigir.
- [ ] Revisar títulos pelo **Admin → Conteúdos**.
- [ ] Se aparecer o aviso de **arquivos pesados** em **Admin → Conteúdos**,
      tocar em **Otimizar agora**: converte para JPG de alta qualidade na
      mesma resolução e libera espaço no plano do Supabase. Os envios novos
      já saem otimizados.

## 6. Cakto — liberar o acesso automaticamente

### 6.1 Função que recebe o aviso da Cakto (no Supabase)
- [ ] Publicar a função `cakto-webhook` com a verificação de JWT **desligada**
      (pelo terminal: `supabase functions deploy cakto-webhook --no-verify-jwt`,
      ou pelo painel desligando *Enforce JWT verification*).
- [ ] **Edge Functions → Secrets:**
  - [ ] `CAKTO_WEBHOOK_SECRET` → uma frase longa inventada por você (a mesma
        vai na Cakto). Guardar num lugar seguro.
  - [ ] `CAKTO_PRODUCT_IDS` → *opcional*: só se a sua conta Cakto vende outros
        produtos. Lista os ids que dão acesso à biblioteca.

### 6.2 Webhook (na Cakto)
- [ ] Criar o webhook com a URL
      `https://SEU-PROJETO.supabase.co/functions/v1/cakto-webhook`
- [ ] Marcar os eventos **Compra aprovada**, **Reembolso** e **Chargeback**.
- [ ] Colocar a mesma frase secreta de `CAKTO_WEBHOOK_SECRET`.

### 6.3 E-mail que o comprador recebe
- [ ] No e-mail/entrega do produto na Cakto, colocar o link
      `https://SEU-ENDERECO/cadastro` e avisar: *"crie sua conta com o mesmo
      e-mail usado na compra"*.

### 6.4 Teste antes de vender ⚠️
- [ ] Enviar o **evento de teste** da Cakto.
- [ ] No Supabase, abrir a tabela `cakto_events` e olhar a coluna `outcome`:
  - `granted` → funcionando ✅
  - `no_email` → me mandar o conteúdo da coluna `payload` que eu ajusto
- [ ] Teste completo: uma compra real (ou de valor simbólico) → criar conta com
      o e-mail da compra → confirmar → ver a biblioteca liberada.
- [ ] Testar o reembolso: o acesso deve ser retirado.

### 6.5 Quem comprou antes do webhook existir
- [ ] Liberar esses e-mails à mão no SQL Editor (comando em `app/README.md`,
      seção *Exceções pelo SQL Editor*). O e-mail vai sempre em minúsculas.

## 7. Testes nos aparelhos (com o site no ar)

- [ ] **iPhone:** tocar em Baixar → deve abrir o menu com "Salvar imagem" e a
      imagem ir para as Fotos. Testar no **Safari** e no **Chrome**.
- [ ] **iPhone:** fechar o menu sem salvar → o contador de downloads não sobe.
- [ ] **Android e PC:** Baixar faz o download direto.
- [ ] **Instalar como app:** iPhone (Safari → Compartilhar → Adicionar à Tela de
      Início) e Android (Chrome → ⋮ → Instalar app). Conferir o ícone do leão.
- [ ] **Prévia do link:** colar o endereço numa conversa do WhatsApp e conferir
      imagem, título e descrição. (O WhatsApp guarda a prévia por um tempo: para
      testar de novo depois de uma mudança, use o endereço com `?v=2` no fim.)
- [ ] **Guia "Como aplicar":** revisar os textos, principalmente os passos do
      Widgetsmith.
- [ ] **Recuperar senha:** pedir "Esqueci minha senha" e conferir se o e-mail
      chega e o link funciona.
- [ ] **Sem compra:** criar uma conta com um e-mail que não comprou → deve
      aparecer a tela explicando que o acesso não foi liberado.

## 8. Pronto para vender

- [ ] Todos os itens acima marcados.
- [ ] Link do site conferido na página de vendas e no e-mail da Cakto.
