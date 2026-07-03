import { createClient } from "@supabase/supabase-js";
import { env } from "@/core/utils/env";

/**
 * Cliente Supabase com a service role key — ignora Row Level Security.
 * Uso restrito a operações administrativas server-side (ex: seed, criação
 * de usuário pelo Admin). NUNCA importar este arquivo em código que roda
 * no browser nem em Client Components.
 */
export function createSupabaseAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
