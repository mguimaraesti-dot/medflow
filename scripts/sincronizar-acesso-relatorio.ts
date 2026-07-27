import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Carga inicial do acesso ao relatorio-exames (Opção 4 — app_metadata,
 * ver CLAUDE.md "Acesso ao relatorio-exames"): sincroniza TODO usuário
 * já existente no MedFlow, não só quem for criado/editado a partir de
 * agora. Roda a mesma função usada pelos use-cases de Gestão de
 * Acessos (`syncRelatorioAccessForUser`) — uma lógica só, chamada tanto
 * no fluxo normal quanto aqui, pra carga inicial nunca divergir do
 * sync contínuo com o tempo.
 *
 * Pula o usuário de sistema do WhatsApp (`WHATSAPP_SYSTEM_USER_EMAIL`)
 * de propósito — ele não tem conta real no Supabase Auth
 * (`supabaseAuthId` é um UUID sentinela, ver `prisma/seed.ts`), então
 * a Admin API sempre devolveria "usuário não encontrado" pra ele.
 *
 * IMPORTANTE (ordem da migração — ver CLAUDE.md): rodar este script e
 * CONFIRMAR que os logins de teste continuam funcionando ANTES de
 * dropar `usuarios_autorizados` no relatorio-exames. Se a gravação
 * falhar por qualquer motivo e a tabela já tiver sido removida, ninguém
 * consegue mais entrar no relatório e não sobra caminho de volta.
 *
 * Uso: `npx tsx scripts/sincronizar-acesso-relatorio.ts`
 */

const prisma = new PrismaClient();

async function main() {
  const { syncRelatorioAccessForUser } =
    await import("../src/core/integrations/relatorio-exames-sync");
  const { createSupabaseAdminClient } =
    await import("../src/core/auth/supabase-admin.client");
  const { WHATSAPP_SYSTEM_USER_EMAIL } =
    await import("../src/features/accounts-payable/domain/whatsapp-system-user");

  const supabaseAdmin = createSupabaseAdminClient();

  const usuarios = await prisma.user.findMany({
    where: { email: { not: WHATSAPP_SYSTEM_USER_EMAIL } },
    select: {
      id: true,
      email: true,
      status: true,
      role: { select: { name: true } },
    },
    orderBy: { email: "asc" },
  });

  console.log(`Sincronizando ${usuarios.length} usuário(s)...\n`);

  for (const usuario of usuarios) {
    await syncRelatorioAccessForUser(usuario.id, { supabaseAdmin });
    console.log(
      `✔ ${usuario.email} (${usuario.role?.name ?? "sem papel"}, ${usuario.status})`,
    );
  }

  console.log(
    "\nConcluído. Confira os logs acima (e o terminal do Next.js, se rodando) por qualquer '❌'/erro antes de prosseguir.",
  );
}

main()
  .catch((error) => {
    console.error("\nFALHA na sincronização:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
