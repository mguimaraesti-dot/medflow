import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/core/utils/env";

/**
 * Cliente Supabase para uso no servidor (Server Components, Route Handlers,
 * Server Actions). Lê/grava a sessão via cookies do Next.js.
 *
 * Este é o cliente usado por core/permissions (RBAC) e pelos use cases de
 * autenticação — nunca confiar em dados de sessão vindos do client (ver
 * Coding Standards 13.11).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // Escopa o cookie de sessão no domínio pai (".medflow.com.br", por
      // exemplo) — sem isso, o login feito aqui não é visto pelo sistema
      // de Relatório de Exames no subdomínio irmão (mesmo projeto
      // Supabase, mesmo auth.users, cookie host-only por padrão). Vazio
      // em desenvolvimento local: navegador rejeita Domain= em localhost.
      cookieOptions: { domain: env.NEXT_PUBLIC_COOKIE_DOMAIN },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado a partir de um Server Component (sem permissão de escrita
            // em cookies). É seguro ignorar aqui se houver middleware
            // renovando a sessão — item a confirmar na Task 4 (Autenticação).
          }
        },
      },
    },
  );
}
