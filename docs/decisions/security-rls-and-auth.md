# Segurança — RLS e Auth (Supabase)

> Registrado a partir dos alertas do Supabase Security Advisor (linter), logo após a Task 2.

## RLS habilitado sem policies (migration `20260703160325_enable_row_level_security`)

**Alerta original:** todas as 14 tabelas + `_prisma_migrations` apareciam como `ERROR` — "RLS Disabled in Public" no Security Advisor do Supabase.

**Causa:** o Supabase expõe automaticamente uma API REST/GraphQL (PostgREST) para qualquer tabela do schema `public`. Sem RLS, qualquer pessoa com a chave `publishable`/`anon` — que é pública por definição, vai no bundle do navegador (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) — consegue ler e escrever direto nas tabelas por essa API, sem passar pela nossa aplicação (sem RBAC, sem auditoria, sem regra de negócio nenhuma).

**Por que a correção foi só "habilitar RLS sem policies", e não escrever policies:** o MedFlow não usa a API do Supabase (PostgREST) para dados de negócio. A aplicação acessa o Postgres diretamente via Prisma, autenticada com o papel `postgres` (dono das tabelas), que **sempre ignora RLS**, com ou sem ele habilitado. Ou seja: RLS habilitado sem nenhuma policy = acesso 100% bloqueado via PostgREST, e zero efeito sobre o Prisma/aplicação.

**Isso muda no futuro?** Só se alguma feature passar a usar o client Supabase (`anon`/`authenticated`) para ler dados diretamente do navegador, sem passar pelas nossas API Routes. Não é o caso hoje nem está planejado no MVP (ver `MedFlow-Coding-Standards.md`, regra de `organizationId` nunca vir do cliente — o mesmo princípio de nunca confiar em acesso direto do frontend aplica aqui). Se isso mudar, será necessário desenhar policies explícitas por tabela nesse momento, não antes.

## Pendente — Leaked Password Protection (WARN, não bloqueante)

O Security Advisor também reportou (nível `WARN`, não `ERROR`): **"Leaked Password Protection Disabled"** — o Supabase Auth pode checar senhas contra a base do [HaveIBeenPwned](https://haveibeenpwned.com) no cadastro/troca de senha, e essa checagem está desligada.

**Ação pendente (feita pelo painel, não por migration):** Supabase → Authentication → Policies (ou Auth Settings, dependendo da versão da UI) → habilitar **"Leaked password protection"**.

Não bloqueia a Sprint 1 (é só um `WARN`), mas deve ser habilitado antes de qualquer usuário real além do admin do seed começar a definir senha no sistema.
