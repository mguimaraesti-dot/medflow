import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase para uso no browser ("use client") — só para os
 * fluxos que o Supabase Auth exige rodar no client (OAuth redirect,
 * reset/atualização de senha). Nunca usar para ler dados de negócio:
 * isso continua sempre passando pelas API Routes (Coding Standards).
 *
 * Lê `process.env.NEXT_PUBLIC_*` direto (em vez de `core/utils/env.ts`)
 * de propósito: aquele módulo também valida segredos server-only
 * (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY) que o Next.js nunca inlina
 * no bundle do client — importá-lo aqui faria a validação falhar no
 * browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
