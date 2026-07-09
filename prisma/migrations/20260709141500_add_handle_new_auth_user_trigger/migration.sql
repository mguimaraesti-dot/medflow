-- Auto-provisionamento de usuário: toda vez que o Supabase Auth cria
-- uma linha em auth.users (convite de Admin/Gerente via
-- inviteUserByEmail, ou primeiro login via Google OAuth), cria
-- automaticamente a linha correspondente em public.users com
-- status PENDING e sem perfil (roleId NULL) — só um Gerente ou
-- Administrador, pela tela de Gestão de Acessos, atribui o perfil e
-- ativa o usuário depois.
--
-- SECURITY DEFINER é necessário porque o evento de INSERT em
-- auth.users roda no contexto do serviço de autenticação do Supabase
-- (supabase_auth_admin), que não tem privilégio de escrever em
-- public.users por padrão. search_path fixo evita sequestro de
-- função por causa do SECURITY DEFINER (boa prática recomendada pelo
-- próprio Supabase para este padrão).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id TEXT;
  v_name TEXT;
BEGIN
  -- Já existe uma linha pra este auth user (corrida com outro
  -- processo, ou reprocessamento) — não faz nada.
  IF EXISTS (SELECT 1 FROM "users" WHERE "supabaseAuthId" = NEW.id::text) THEN
    RETURN NEW;
  END IF;

  -- MVP mono-organização (mesmo pressuposto do prisma/seed.ts) — usa a
  -- única organização existente.
  SELECT "id" INTO v_org_id FROM "organizations" ORDER BY "createdAt" LIMIT 1;

  v_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO "users" (
    "id", "organizationId", "name", "email", "supabaseAuthId",
    "roleId", "status", "createdAt", "updatedAt"
  ) VALUES (
    NEW.id::text, v_org_id, v_name, NEW.email, NEW.id::text,
    NULL, 'PENDING', now(), now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
