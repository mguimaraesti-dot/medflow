-- Mesma decisão de docs/decisions/security-rls-and-auth.md (migration
-- 20260703160325_enable_row_level_security): fecha o acesso público via
-- PostgREST às tabelas novas do Motor de Tesouraria. Zero efeito sobre
-- Prisma/aplicação (conecta como "postgres", que ignora RLS).

ALTER TABLE "safes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "safe_movements" ENABLE ROW LEVEL SECURITY;
