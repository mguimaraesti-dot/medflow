-- Corrige 2 achados do linter de segurança do Supabase (Advisors).
--
-- 1) accounts_payable_attachments ficou de fora da migration
--    20260703160325_enable_row_level_security (criada depois dela, na
--    feature de anexos via Google Drive) — mesmo problema documentado em
--    docs/decisions/security-rls-and-auth.md: sem RLS, a tabela fica
--    exposta por padrão via PostgREST pra qualquer chave anon. Fecha o
--    acesso público, sem nenhuma policy (mesmo padrão das demais
--    tabelas) — zero efeito sobre o Prisma, que conecta como "postgres"
--    e sempre ignora RLS.
ALTER TABLE "accounts_payable_attachments" ENABLE ROW LEVEL SECURITY;

-- 2) handle_new_auth_user() é SECURITY DEFINER (necessário pra escrever
--    em public.users a partir do trigger em auth.users, que roda como
--    supabase_auth_admin) mas o Postgres concede EXECUTE a PUBLIC por
--    padrão na criação de qualquer função — isso deixa a função
--    chamável direto via /rest/v1/rpc/handle_new_auth_user por qualquer
--    cliente anon/authenticated, o que nunca foi a intenção (ela só deve
--    rodar via o trigger on_auth_user_created). O trigger continua
--    funcionando normalmente: a invocação por trigger não depende de
--    GRANT EXECUTE do role que disparou o evento.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
