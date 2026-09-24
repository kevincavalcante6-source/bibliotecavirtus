# E-mails do Supabase em português

Onde colar: **Supabase → Authentication → Email Templates**.

| Modelo no Supabase | Assunto (campo *Subject*) | Corpo (campo *Message body*) |
| --- | --- | --- |
| **Confirm signup** | `Confirme seu e-mail — Biblioteca Virtus` | conteúdo de `confirmar-cadastro.html` |
| **Reset Password** | `Crie uma nova senha — Biblioteca Virtus` | conteúdo de `redefinir-senha.html` |

Cole o arquivo **inteiro** no corpo, substituindo o texto em inglês, e clique em **Save**.

Os outros modelos (*Magic Link*, *Change Email Address*, *Invite user*,
*Reauthentication*) não são usados pelo site e podem ficar como estão.

## Antes de colar

- O endereço do site precisa estar configurado em **Authentication → URL
  Configuration → Site URL**: o logo do e-mail vem de `{{ .SiteURL }}/icon-192.png`
  e os botões dependem dele.
- Não apague as partes entre `{{ }}` — o Supabase troca pelo link de verdade.
- Para os e-mails chegarem de forma confiável (e sem cair no spam), configure o
  **SMTP próprio** antes (ver `LANCAMENTO.md`, etapa 4.2).

## Teste

Crie uma conta de teste pelo site e peça "Esqueci minha senha": os dois e-mails
devem chegar em português, com o botão funcionando.
