-- Habilita Row Level Security (RLS) em todas as tabelas do schema public,
-- SEM nenhuma policy associada.
--
-- Por quê: o Supabase expõe automaticamente uma API REST/GraphQL
-- (PostgREST) para qualquer tabela do schema "public". Sem RLS, qualquer
-- pessoa com a chave publishable/anon (que é pública por natureza, vai
-- no navegador) consegue ler e escrever diretamente nas tabelas por essa
-- API, ignorando toda a aplicação (RBAC, auditoria, regras de negócio).
-- O linter de segurança do Supabase (aba "Security and quality" >
-- "Advisors") aponta isso como ERROR para cada tabela.
--
-- O MedFlow NÃO usa essa API para dados: a aplicação acessa o Postgres
-- diretamente via Prisma, autenticada como o usuário "postgres" (dono
-- das tabelas), que sempre ignora RLS — com ou sem ele habilitado. Ou
-- seja: esta migration fecha o acesso público via PostgREST sem afetar
-- em nada o funcionamento da aplicação.
--
-- IMPORTANTE para o futuro: sem nenhuma policy, RLS habilitado = acesso
-- negado por padrão via PostgREST (não é "RLS habilitado, mas aberto" -
-- é "fechado completamente" até que policies explícitas sejam criadas).
-- Se algum dia uma feature passar a usar o client Supabase (anon/
-- authenticated) para ler dados direto do navegador sem passar pelo
-- nosso backend, será necessário criar policies explícitas nas tabelas
-- envolvidas. Enquanto toda a leitura/escrita de dados de negócio passar
-- pelas nossas API Routes (via Prisma), isso não é necessário.

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_register_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_flow_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts_payable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_PermissionToRole" ENABLE ROW LEVEL SECURITY;

-- Tabela interna do Prisma (controle de migrations) — também fica
-- exposta por padrão no schema public, mesmo problema.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
