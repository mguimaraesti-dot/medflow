import { createClient } from "@supabase/supabase-js";
import { env } from "@/core/utils/env";

/**
 * Cliente Supabase com a service role key — só para operações
 * administrativas do Auth (convidar usuário novo via
 * `create-user.use-case.ts`). NUNCA importar isto em código "use
 * client": `env.SUPABASE_SERVICE_ROLE_KEY` não é `NEXT_PUBLIC_*`, então
 * o Next.js nunca a inclui no bundle do navegador — importar este
 * arquivo do client faria a validação de `core/utils/env.ts` falhar
 * (mesma proteção que já vale para `supabase-server.client.ts`).
 *
 * Até aqui essa chave só era usada em scripts (`prisma/seed.ts`,
 * `prisma/create-test-user.ts`) — este é o primeiro uso dela dentro do
 * runtime da aplicação.
 */
export function createSupabaseAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
