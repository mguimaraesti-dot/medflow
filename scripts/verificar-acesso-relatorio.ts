import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/**
 * Reconciliação do acesso ao relatorio-exames (Opção 4 — app_metadata,
 * ver CLAUDE.md "Acesso ao relatorio-exames"): cruza quem DEVERIA ter
 * acesso (calculado aqui, a partir do papel/status de cada usuário do
 * MedFlow — a mesma fonte da verdade que `syncRelatorioAccessForUser`
 * usa) com o que está REALMENTE gravado em `app_metadata.relatorioPerfil`
 * de cada um (via Admin API do Supabase).
 *
 * Existe porque a sincronização pode falhar em silêncio — rede
 * instável, Admin API fora do ar, um bug futuro — e sem isso ninguém
 * percebe até alguém reclamar de tela em branco (foi exatamente o que
 * aconteceu com a Paula antes deste mecanismo existir). Roda sob
 * demanda ou periodicamente; não corrige nada sozinho, só aponta a
 * divergência — corrigir é rodar `sincronizar-acesso-relatorio.ts`
 * (ou investigar, se a divergência for suspeita).
 *
 * Não precisa de nenhum acesso ao schema `relatorio` pra existir: usa
 * só a tabela `User` do próprio MedFlow (fonte da verdade) e a Admin
 * API do Supabase Auth (que o MedFlow já usa em outros lugares) — o
 * mesmo motivo pelo qual a Opção 4 não abre grant nenhum entre os
 * bancos.
 *
 * Uso: `npx tsx scripts/verificar-acesso-relatorio.ts`
 */

const prisma = new PrismaClient();

async function main() {
  const { mapRoleToRelatorioPerfil } =
    await import("../src/core/permissions/relatorio-perfil");
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
      supabaseAuthId: true,
      role: { select: { permissions: { select: { key: true } } } },
    },
    orderBy: { email: "asc" },
  });

  let divergencias = 0;

  for (const usuario of usuarios) {
    const permissions =
      usuario.status === "ACTIVE"
        ? (usuario.role?.permissions.map((p) => p.key) ?? [])
        : [];
    const esperado = mapRoleToRelatorioPerfil(permissions);

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(
      usuario.supabaseAuthId,
    );

    if (error || !data.user) {
      console.log(
        `❌ ${usuario.email}: não encontrado no Supabase Auth (${error?.message ?? "sem detalhe"})`,
      );
      divergencias++;
      continue;
    }

    const atual =
      (data.user.app_metadata?.relatorioPerfil as
        "leitor" | "gestor" | "admin" | null | undefined) ?? null;

    if (atual !== esperado) {
      console.log(
        `❌ ${usuario.email}: esperado=${JSON.stringify(esperado)} atual=${JSON.stringify(atual)}`,
      );
      divergencias++;
    } else {
      console.log(`✔ ${usuario.email}: ${JSON.stringify(esperado)}`);
    }
  }

  console.log(
    `\n${usuarios.length} usuário(s) conferido(s), ${divergencias} divergência(s).`,
  );
  if (divergencias > 0) {
    console.log(
      "Rode `npx tsx scripts/sincronizar-acesso-relatorio.ts` para corrigir, ou investigue antes se a divergência for inesperada.",
    );
  }
}

main()
  .catch((error) => {
    console.error("\nFALHA na reconciliação:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
