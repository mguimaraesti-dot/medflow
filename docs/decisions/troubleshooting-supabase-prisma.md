# Troubleshooting — Conexão Supabase + Prisma

> Registrado durante a configuração inicial do banco (Task 2). Mantido aqui porque não é uma decisão de arquitetura (não entra em ADR), mas é operacional e vai se repetir para qualquer pessoa nova configurando o projeto.

## Por que duas URLs diferentes (`DATABASE_URL` e `DIRECT_URL`)

- **`DATABASE_URL`** → Transaction pooler do Supabase (Supavisor), porta **6543**. Usada pela aplicação em runtime. Precisa de `?pgbouncer=true&connection_limit=1` no final — sem isso, o Prisma tenta usar prepared statements que o pooler em modo transação não suporta, e queries falham com `prepared statement "sX" already exists`.
- **`DIRECT_URL`** → usada só pelo Prisma CLI (`migrate`, `db seed`). **Não use a conexão direta pura** (`db.<projeto>.supabase.co:5432`) a menos que sua rede tenha IPv6 — a maioria das redes domésticas/corporativas no Brasil não tem, e a conexão trava (`P1001: Can't reach database server`). Use o **Session pooler** (mesmo host do pooler, `aws-X-<região>.pooler.supabase.com`, mas porta **5432** em vez de 6543). O Session pooler funciona por IPv4 e suporta as operações que o `prisma migrate` precisa (diferente do Transaction pooler, que trava nessa mesma operação).

Resultado (exemplo, com placeholders):
```
DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-X-<região>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<ref>:<senha>@aws-X-<região>.pooler.supabase.com:5432/postgres"
```

## Erro: `prepared statement "sX" already exists`

Aparece mesmo com `?pgbouncer=true` já configurado, **se em algum momento anterior você já rodou uma query contra o pooler sem esse parâmetro**. O pooler mantém a declaração presa até o projeto ser reiniciado.

**Solução:** Supabase → Settings → General (ou Infrastructure) → **Restart project**. Depois de reiniciar, rodar o comando de novo.

## Erro: `P1001: Can't reach database server at db.<projeto>.supabase.co:5432`

Você está tentando usar a conexão **direta** (não o pooler) e sua rede não suporta IPv6, que é o padrão dessa conexão no Supabase. Troque para o **Session pooler** (porta 5432, host do pooler) como `DIRECT_URL`, conforme a seção acima.

## Checklist rápido se `migrate` ou `db seed` travarem/falharem

1. `DATABASE_URL` está na porta 6543, com `?pgbouncer=true&connection_limit=1`?
2. `DIRECT_URL` está na porta 5432, no host do **pooler** (não `db.<projeto>.supabase.co`)?
3. Se o erro for de prepared statement, já tentou reiniciar o projeto no Supabase?
4. As duas URLs não estão trocadas entre si (erro comum ao copiar da tela "Connect")?
