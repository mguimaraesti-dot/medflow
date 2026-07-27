import type { SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { mapRoleToRelatorioPerfil } from "@/core/permissions/relatorio-perfil";

interface Deps {
  supabaseAdmin: SupabaseClient;
}

/**
 * Sincroniza o acesso ao relatorio-exames (app irmão, mesmo projeto
 * Supabase Auth) gravando `app_metadata.relatorioPerfil` no usuário —
 * é dali que o `requireAuthorized()` do relatório lê. Sem tabela de
 * sincronização, sem grant entre schemas — decisão registrada em
 * CLAUDE.md, "Acesso ao relatorio-exames" (não reintroduzir uma
 * tabela de exceção manual sem reler esse motivo).
 *
 * Relê o estado atual do usuário no Postgres em vez de receber
 * permissões já calculadas por quem chama — reflete sempre o que foi
 * persistido, e todo call site (criar/editar/mudar status) vira uma
 * chamada só, sem montar a lista de permissões na mão. INACTIVE/
 * PENDING sempre mapeiam para `null` (sem `DASHBOARD_READ` — nem
 * chega a olhar o papel).
 *
 * NUNCA lança: qualquer falha (rede, Admin API fora do ar, usuário sem
 * conta real no Supabase Auth — ex.: o usuário de sistema do WhatsApp)
 * é logada e engolida. Sincronizar o relatório é efeito colateral da
 * Gestão de Acessos, nunca pode derrubar criar/editar/desativar
 * usuário — por isso quem chama não precisa de try/catch.
 *
 * Propagação: não existe uma chamada de Admin API que invalide sessões
 * de um usuário por id (o `admin.signOut()` do Supabase pede o JWT de
 * uma sessão específica, não um id — não dá pra usar aqui). O
 * `requireAuthorized()` do relatório usa `getUser()` (não
 * `getSession()`), que valida contra o servidor do Supabase Auth a
 * cada chamada — na prática isso deve refletir esta gravação já na
 * próxima requisição, concessão ou revogação, sem esperar o JWT
 * expirar. Mas isso depende de um detalhe de implementação do
 * GoTrue que vale confirmar na prática (revogar um acesso e conferir
 * se nega no próximo carregamento sem logout) antes de tratar como
 * garantido — documentado em CLAUDE.md dos dois repositórios.
 */
export async function syncRelatorioAccessForUser(
  userId: string,
  deps: Deps,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        supabaseAuthId: true,
        status: true,
        role: { select: { permissions: { select: { key: true } } } },
      },
    });

    if (!user) return;

    const permissions =
      user.status === "ACTIVE"
        ? (user.role?.permissions.map((p) => p.key) ?? [])
        : [];
    const perfilNovo = mapRoleToRelatorioPerfil(permissions);

    const { data: existing, error: getError } =
      await deps.supabaseAdmin.auth.admin.getUserById(user.supabaseAuthId);

    if (getError || !existing.user) {
      logger.error(
        "Falha ao ler usuário do Supabase Auth para sincronizar acesso ao relatorio-exames",
        { userId, error: getError?.message },
      );
      return;
    }

    const { error: updateError } =
      await deps.supabaseAdmin.auth.admin.updateUserById(user.supabaseAuthId, {
        app_metadata: {
          ...existing.user.app_metadata,
          relatorioPerfil: perfilNovo,
        },
      });

    if (updateError) {
      logger.error("Falha ao gravar app_metadata.relatorioPerfil", {
        userId,
        perfilNovo,
        error: updateError.message,
      });
      return;
    }

    logger.info("Acesso ao relatorio-exames sincronizado", {
      userId,
      perfilNovo,
    });
  } catch (error) {
    logger.error("Falha inesperada ao sincronizar acesso ao relatorio-exames", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
