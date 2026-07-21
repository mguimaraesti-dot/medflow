import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

/**
 * ONE-OFF — remove as contas de teste criadas durante os testes de
 * integração WhatsApp/Z-API: beneficiário "Teste de Sistema", categoria
 * "Teste", R$ 1,00, status PAGA.
 *
 * Investigação prévia (consulta de leitura direta no banco) confirmou:
 * nenhuma das contas candidatas tem `SafeMovement` associado
 * (`paymentOrigin` não era COFRE em nenhuma) — a baixa delas nunca
 * debitou o Cofre, então apagá-las não exige estornar nada nem mexer
 * em saldo. Também confirmado: zero anexos. Este script REVALIDA os
 * dois fatos em runtime (não confia só na investigação prévia) antes
 * de apagar.
 *
 * Não existe exclusão física de `AccountsPayable` no código da
 * aplicação (só soft-delete, e só para status PENDENTE — ver
 * `soft-delete-accounts-payable.use-case.ts`) — de propósito: contas
 * pagas protegem o histórico. Este script contorna essa regra
 * deliberadamente, só para estas 5 linhas específicas de lixo de
 * teste, com critério bem restrito (4 campos combinados, não só um) e
 * um limite rígido de contagem (aborta se não for exatamente 5).
 *
 * `AuditLog` NÃO é apagado — vira um ponteiro órfão (entityId aponta
 * pra um id que deixa de existir), mas o próprio `AuditLog.entityId` já
 * é uma string solta, sem FK, então isso não quebra nada; preserva o
 * rastro de auditoria em vez de apagá-lo (CLAUDE.md: "Auditoria não é
 * opcional"). O script grava UM AuditLog novo por conta, registrando a
 * própria exclusão, antes de apagar a linha.
 *
 * DRY-RUN POR PADRÃO — só lê e imprime, não grava nada. Só apaga com
 * `--confirm`.
 *
 * Uso:
 *   npx tsx scripts/cleanup-test-accounts-payable.ts --user=<id do operador>
 *     → dry-run (não apaga nada)
 *   npx tsx scripts/cleanup-test-accounts-payable.ts --user=<id> --confirm
 *     → apaga de verdade (dentro de uma transação)
 *   ... --org=<organizationId>
 *     → só necessário se existir mais de uma Organization no banco
 *       (MVP é mono-organização; sem --org, o script exige que exista
 *       exatamente uma)
 */

const prisma = new PrismaClient();

// Critério de busca — TODOS os 4 campos combinados (nunca um sozinho),
// pra nunca pegar por engano algo que não seja lixo de teste.
const TARGET_SUPPLIER_NAME = "Teste de Sistema";
const TARGET_CATEGORY_NAME = "Teste";
const TARGET_AMOUNT = "1.00";
const TARGET_STATUS = "PAID" as const;

// Contagem esperada — número diferente disso aborta o script inteiro,
// nas duas fases (dry-run e confirm).
const EXPECTED_COUNT = 5;

function parseArgs() {
  const args = process.argv.slice(2);
  const confirm = args.includes("--confirm");
  const userArg = args.find((arg) => arg.startsWith("--user="));
  const orgArg = args.find((arg) => arg.startsWith("--org="));
  return {
    confirm,
    userId: userArg?.split("=")[1],
    organizationId: orgArg?.split("=")[1],
  };
}

async function resolveOrganization(organizationId?: string) {
  if (organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new Error(`Organização não encontrada: ${organizationId}`);
    }
    return organization;
  }

  const organizations = await prisma.organization.findMany();
  if (organizations.length === 0) {
    throw new Error("Nenhuma organização encontrada no banco.");
  }
  if (organizations.length > 1) {
    const list = organizations.map((o) => `${o.id} (${o.name})`).join(", ");
    throw new Error(
      `Existe mais de uma organização (${organizations.length}) — rode de novo com --org=<id> explícito. Encontradas: ${list}`,
    );
  }
  return organizations[0];
}

/** Busca as contas candidatas + conta os dependentes de cada uma — usada tanto no dry-run quanto (de novo, dentro da transação) no confirm. */
async function findCandidates(organizationId: string) {
  const candidates = await prisma.accountsPayable.findMany({
    where: {
      organizationId,
      status: TARGET_STATUS,
      amount: new Prisma.Decimal(TARGET_AMOUNT),
      supplier: { name: TARGET_SUPPLIER_NAME },
      category: { name: TARGET_CATEGORY_NAME },
    },
    include: {
      supplier: { select: { name: true } },
      category: { select: { name: true } },
      _count: {
        select: {
          attachments: true,
          cashFlowEntries: true,
          safeMovements: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const withAuditLogCount = await Promise.all(
    candidates.map(async (candidate) => {
      const auditLogCount = await prisma.auditLog.count({
        where: { entity: "AccountsPayable", entityId: candidate.id },
      });
      return { ...candidate, auditLogCount };
    }),
  );

  return withAuditLogCount;
}

type Candidate = Awaited<ReturnType<typeof findCandidates>>[number];

function printCandidates(candidates: Candidate[]) {
  console.log(`Encontradas: ${candidates.length} conta(s)`);
  console.log("");
  for (const candidate of candidates) {
    console.log(`  id                : ${candidate.id}`);
    console.log(`  descrição         : ${candidate.description}`);
    console.log(`  beneficiário      : ${candidate.supplier.name}`);
    console.log(`  categoria         : ${candidate.category.name}`);
    console.log(`  valor             : ${candidate.amount.toFixed(2)}`);
    console.log(`  status            : ${candidate.status}`);
    console.log(
      `  paidAt            : ${candidate.paidAt?.toISOString() ?? "—"}`,
    );
    console.log(`  paymentOrigin     : ${candidate.paymentOrigin}`);
    console.log(
      `  dependentes       : attachments=${candidate._count.attachments}, cashFlowEntries=${candidate._count.cashFlowEntries}, safeMovements=${candidate._count.safeMovements}, auditLogs=${candidate.auditLogCount}`,
    );
    console.log("");
  }
}

/** Aborta o processo (fora de transação) com uma mensagem clara. */
function abort(message: string): never {
  console.error(`ABORTADO: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

/**
 * Valida os critérios de segurança contra uma lista de candidatos já
 * carregada — reaproveitada tanto no dry-run quanto (de novo, com dados
 * frescos) dentro da transação do confirm.
 */
function validateCandidates(candidates: Candidate[]) {
  if (candidates.length !== EXPECTED_COUNT) {
    abort(
      `esperava exatamente ${EXPECTED_COUNT} contas, encontrou ${candidates.length}. Algo está fora do esperado — revise manualmente antes de rodar de novo.`,
    );
  }

  const withSafeMovements = candidates.filter(
    (c) => c._count.safeMovements > 0,
  );
  if (withSafeMovements.length > 0) {
    abort(
      `${withSafeMovements.length} conta(s) têm SafeMovement associado (ids: ${withSafeMovements.map((c) => c.id).join(", ")}) — o Cofre pode ter sido afetado. NÃO seguro apagar automaticamente; revise manualmente.`,
    );
  }

  const withAttachments = candidates.filter((c) => c._count.attachments > 0);
  if (withAttachments.length > 0) {
    abort(
      `${withAttachments.length} conta(s) têm anexo (ids: ${withAttachments.map((c) => c.id).join(", ")}) — a FK de AccountsPayableAttachment é RESTRICT, apagar falharia (ou pior, um anexo real seria perdido). Revise manualmente.`,
    );
  }

  console.log(
    ">>> CONFIRMADO: nenhuma das contas tem SafeMovement associado — o saldo do Cofre NÃO será afetado. <<<",
  );
}

async function main() {
  const { confirm, userId, organizationId } = parseArgs();

  if (!userId) {
    console.error(
      "Faltou --user=<id>. Informe o id do usuário responsável por esta limpeza — vira o autor do AuditLog de exclusão.\n" +
        "Pra encontrar o id: consulte a tabela User pelo e-mail (ex.: via Prisma Studio ou uma query direta).",
    );
    process.exit(1);
  }

  const performingUser = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!performingUser) {
    console.error(`Usuário não encontrado: ${userId}. Abortando.`);
    process.exit(1);
  }

  const organization = await resolveOrganization(organizationId);

  console.log("=== Limpeza de Contas de Teste (WhatsApp) ===");
  console.log(`Organização : ${organization.name} (${organization.id})`);
  console.log(
    `Critério    : beneficiário="${TARGET_SUPPLIER_NAME}" + categoria="${TARGET_CATEGORY_NAME}" + valor=${TARGET_AMOUNT} + status=${TARGET_STATUS}`,
  );
  console.log(`Executado por: ${performingUser.name} (${performingUser.id})`);
  console.log(
    `Modo        : ${confirm ? "CONFIRM (vai apagar)" : "DRY-RUN (só leitura)"}`,
  );
  console.log("");

  const candidates = await findCandidates(organization.id);
  printCandidates(candidates);
  validateCandidates(candidates);

  if (!confirm) {
    console.log("");
    console.log(
      ">>> DRY-RUN — nada foi apagado. Rode com --confirm para apagar. <<<",
    );
    await prisma.$disconnect();
    return;
  }

  const dryRunIds = new Set(candidates.map((c) => c.id));

  const result = await prisma.$transaction(async (tx) => {
    // Revalidação em runtime, IMEDIATAMENTE antes de apagar — dados
    // frescos, dentro da própria transação (isolamento evita corrida
    // com qualquer escrita concorrente).
    const freshCandidates = await tx.accountsPayable.findMany({
      where: {
        organizationId: organization.id,
        status: TARGET_STATUS,
        amount: new Prisma.Decimal(TARGET_AMOUNT),
        supplier: { name: TARGET_SUPPLIER_NAME },
        category: { name: TARGET_CATEGORY_NAME },
      },
      include: {
        supplier: { select: { name: true } },
        category: { select: { name: true } },
        _count: {
          select: {
            attachments: true,
            cashFlowEntries: true,
            safeMovements: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (freshCandidates.length !== EXPECTED_COUNT) {
      throw new Error(
        `Revalidação: esperava ${EXPECTED_COUNT} contas, encontrou ${freshCandidates.length} — abortando transação.`,
      );
    }

    const freshIds = new Set(freshCandidates.map((c) => c.id));
    const idsMatch =
      freshIds.size === dryRunIds.size &&
      [...freshIds].every((id) => dryRunIds.has(id));
    if (!idsMatch) {
      throw new Error(
        "Revalidação: os ids encontrados agora são diferentes dos ids do dry-run — o banco mudou entre as duas execuções. Abortando transação.",
      );
    }

    const withSafeMovements = freshCandidates.filter(
      (c) => c._count.safeMovements > 0,
    );
    if (withSafeMovements.length > 0) {
      throw new Error(
        `Revalidação: ${withSafeMovements.length} conta(s) agora têm SafeMovement associado — abortando transação, NÃO apagar.`,
      );
    }

    const withAttachments = freshCandidates.filter(
      (c) => c._count.attachments > 0,
    );
    if (withAttachments.length > 0) {
      throw new Error(
        `Revalidação: ${withAttachments.length} conta(s) agora têm anexo — abortando transação, NÃO apagar.`,
      );
    }

    const ids = freshCandidates.map((c) => c.id);

    await tx.auditLog.createMany({
      data: freshCandidates.map((candidate) => ({
        userId: performingUser.id,
        entity: "AccountsPayable",
        entityId: candidate.id,
        action: "DELETE" as const,
        reason:
          "Limpeza de conta de teste (script one-off: cleanup-test-accounts-payable.ts) — criada durante testes de integração WhatsApp/Z-API, sem SafeMovement associado.",
        before: {
          description: candidate.description,
          supplierName: candidate.supplier.name,
          categoryName: candidate.category.name,
          amount: candidate.amount.toFixed(2),
          status: candidate.status,
          paidAt: candidate.paidAt?.toISOString() ?? null,
        },
      })),
    });

    const deleted = await tx.accountsPayable.deleteMany({
      where: { id: { in: ids } },
    });

    return { ids, deletedCount: deleted.count };
  });

  console.log("");
  console.log("=== EXECUTADO ===");
  console.log(`Contas apagadas: ${result.deletedCount}`);
  for (const id of result.ids) {
    console.log(`  - ${id}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro:", error);
  await prisma.$disconnect();
  process.exit(1);
});
