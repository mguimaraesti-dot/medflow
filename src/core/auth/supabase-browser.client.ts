import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/core/utils/env";

/**
 * Cliente Supabase para uso em Client Components ("use client").
 * Não faz autenticação de rota nem regra de negócio — isso é feito no
 * backend (ver core/auth/supabase-server.client.ts e core/permissions).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
