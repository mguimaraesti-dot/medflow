import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase ISOLADO — nunca persiste sessão em cookies ou
 * localStorage (`persistSession: false`, `autoRefreshToken: false`,
 * `detectSessionInUrl: false`). Só existe na memória de quem o criou.
 *
 * Diferente de `createSupabaseBrowserClient` (que grava a sessão em
 * cookies compartilhados por TODAS as abas do mesmo navegador/perfil):
 * um link de convite ou recuperação de senha pode ser aberto no MESMO
 * navegador onde um admin já está logado (cenário normal — o próprio
 * admin testando o convite que acabou de enviar). Com o client
 * normal, estabelecer a sessão do link sobrescreve os cookies
 * compartilhados, contaminando a sessão do admin logado em outra aba
 * (ou vice-versa, dependendo de qual aba faz refresh de token por
 * último) — bug real encontrado em produção: a senha do admin parava
 * de funcionar logo depois de um convite ser aceito no mesmo
 * navegador. Usar este client isolado em `reset-password-form.tsx`
 * (via `setSession` manual, a partir do token do fragmento da URL)
 * evita esse vazamento por completo.
 */
export function createIsolatedSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
