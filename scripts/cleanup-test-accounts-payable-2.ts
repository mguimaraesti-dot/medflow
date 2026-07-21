import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

/**
 * ONE-OFF (2ª rodada) — remove contas de teste que sobraram depois da
 * limpeza anterior (`cleanup-test-accounts-payable.ts`, PR #51): mesmo
 * lixo de teste da integração WhatsApp/Z-API — beneficiário "Teste de
 * Sistema", categoria "Teste", R$ 1,00 — desta vez só status PAID
 * (diferente da rodada anterior, que também aceitou CANCELLED).
 *
 * Na limpeza anterior confirmamos que esse tipo de conta de teste foi
 * pago sem debitar o Cofre (paymentOrigin BANCO, sem SafeMovement). Este
 * script NÃO confia cegamente nisso de novo — revalida em runtime, por
 * conta, se há SafeMovement ou CashFlowEntry associado antes de apagar
 * qualquer coisa.
 *
 * Diferença de segurança em relação ao script anterior: aquele abortava
 * se a contagem não fosse EXATAMENTE um número fixo. Este é mais
 * flexível — contagem esperada é ~2, mas só aborta de verdade se vier
 * MAIS de 10 (algo bem fora do esperado); uma contagem diferente de 2
 * (mas <= 10) só gera um aviso pra revisão manual antes de confirmar.
 *
 * Não existe exclusão física de `AccountsPayable` no código da
 * aplicação (só soft-delete, e só para status PENDENTE — ver
 * `soft-delete-accounts-payable.use-case.ts`) — de propósito: contas
 * pagas protegem o histórico. Este script contorna essa regra
 * deliberadamente, só para linhas que batem em TODOS os critérios
 * (beneficiário + categoria + valor + status), com um teto rígido de
 * contagem.
 *
 * `AuditLog` NÃO é apagado — vira um ponteiro órfão (entityId aponta
 * pra um id que deixa de existir), mas `AuditLog.entityId` já é uma
 * string solta, sem FK, então isso não quebra nada; preserva o rastro
 * de auditoria em vez de apagá-lo (CLAUDE.md: "Auditoria não é
 * opcional"). O script grava UM AuditLog novo por conta, registrando a
 * própria exclusão, antes de apagar a linha.
 *
 * DRY-RUN POR PADRÃO — só lê e imprime, não grava nada. Só apaga com
 * `--confirm`.
 *
 * Uso:
 *   npx tsx scripts/cleanup-test-accounts-payable-2.ts --user=<id do operador>
 *     → dry-run (não apaga nada)
 *   npx tsx scripts/cleanup-test-accounts-payable-2.ts --user=<id> --confirm
 *     → apaga de verdade (dentro de uma transação)
 *   ... --org=<organizationId>
 *     → só necessário se existir mais de uma Organization no banco
 *       (MVP é mono-organização; sem --org, o script exige que exista
 *       exatamente uma)
 */

const prisma = new PrismaClient();

// Critério de busca — TODOS os 4 campos combinados (nunca um sozinho),
// pra nunca pegar por engano algo que não seja lixo de teste. Desta vez
// só PAID (a rodada anterior também aceitou CANCELLED, mas essa
// variação não apareceu de novo até agora — se aparecer, o aviso de
// contagem abaixo chama atenção pra revisar antes de confirmar).
const TARGET_SUPPLIER_NAME = "Teste de Sistema";
const TARGET_CATEGORY_NAME = "Teste";
const TARGET_AMOUNT = "1.00";
const TARGET_STATUSES: Array<"PAID"> = ["PAID"];

// Contagem esperada — só informativa (gera aviso se diferente, não
// aborta). O teto abaixo é o único limite que realmente aborta o script.
const SOFT_EXPECTED_COUNT = 2;
const MAX_SAFE_COUNT = 10;

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
      status: { in: TARGET_STATUSES },
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
    console.log(`  paidVia           : ${candidate.paidVia ?? "—"}`);
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
  if (candidates.length === 0) {
    console.log(
      ">>> Nenhuma conta encontrada com os critérios — nada a fazer. <<<",
    );
    return;
  }

  if (candidates.length > MAX_SAFE_COUNT) {
    abort(
      `encontrou ${candidates.length} contas — acima do limite de segurança (${MAX_SAFE_COUNT}). Algo está fora do esperado — revise manualmente antes de rodar de novo.`,
    );
  }

  if (candidates.length !== SOFT_EXPECTED_COUNT) {
    console.warn(
      `AVISO: esperava ${SOFT_EXPECTED_COUNT} conta(s) (pelo print anterior), encontrou ${candidates.length}. Não é um erro fatal (está dentro do limite de ${MAX_SAFE_COUNT}), mas revise a lista acima com atenção antes de confirmar.`,
    );
  }

  const withSafeMovements = candidates.filter(
    (c) => c._count.safeMovements > 0,
  );
  if (withSafeMovements.length > 0) {
    abort(
      `${withSafeMovements.length} conta(s) têm SafeMovement associado (ids: ${withSafeMovements.map((c) => c.id).join(", ")}) — o Cofre pode ter sido afetado. NÃO seguro apagar automaticamente; a remoção exigiria estornar o Cofre primeiro. Revise manualmente e decida o estorno antes de tentar de novo.`,
    );
  }

  const withCashFlowEntries = candidates.filter(
    (c) => c._count.cashFlowEntries > 0,
  );
  if (withCashFlowEntries.length > 0) {
    abort(
      `${withCashFlowEntries.length} conta(s) têm CashFlowEntry associado (ids: ${withCashFlowEntries.map((c) => c.id).join(", ")}) — a FK é RESTRICT, apagar falharia (ou pior, um lançamento real de caixa ficaria órfão). Revise manualmente.`,
    );
  }

  const withAttachments = candidates.filter((c) => c._count.attachments > 0);
  if (withAttachments.length > 0) {
    abort(
      `${withAttachments.length} conta(s) têm anexo (ids: ${withAttachments.map((c) => c.id).join(", ")}) — a FK de AccountsPayableAttachment é RESTRICT, apagar falharia (ou pior, um anexo real seria perdido). Revise manualmente.`,
    );
  }

  console.log(
    ">>> CONFIRMADO: nenhuma das contas tem SafeMovement (nem CashFlowEntry) associado — o saldo do Cofre e do Caixa NÃO serão afetados. <<<",
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

  console.log("=== Limpeza de Contas de Teste (WhatsApp) — 2ª rodada ===");
  console.log(`Organização : ${organization.name} (${organization.id})`);
  console.log(
    `Critério    : beneficiário="${TARGET_SUPPLIER_NAME}" + categoria="${TARGET_CATEGORY_NAME}" + valor=${TARGET_AMOUNT} + status IN (${TARGET_STATUSES.join(", ")})`,
  );
  console.log(`Executado por: ${performingUser.name} (${performingUser.id})`);
  console.log(
    `Modo        : ${confirm ? "CONFIRM (vai apagar)" : "DRY-RUN (só leitura)"}`,
  );
  console.log("");

  const candidates = await findCandidates(organization.id);
  printCandidates(candidates);
  validateCandidates(candidates);

  if (candidates.length === 0) {
    await prisma.$disconnect();
    return;
  }

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
        status: { in: TARGET_STATUSES },
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

    if (freshCandidates.length > MAX_SAFE_COUNT) {
      throw new Error(
        `Revalidação: encontrou ${freshCandidates.length} contas — acima do limite de segurança (${MAX_SAFE_COUNT}). Abortando transação.`,
      );
    }

    const freshIds = new Set(freshCandidates.map((c) => c.id));
    const idsMatch =
      freshIds.size === dryRunIds.size &&
      [...freshIds].every((id) => dryRunIds.has(id));
    if (!idsMatch) {
      throw new Error(
        "Revalidação: os ids encontrados agora são diferentes dos ids vistos no início desta mesma execução — o banco mudou no meio do processo. Abortando transação.",
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

    const withCashFlowEntries = freshCandidates.filter(
      (c) => c._count.cashFlowEntries > 0,
    );
    if (withCashFlowEntries.length > 0) {
      throw new Error(
        `Revalidação: ${withCashFlowEntries.length} conta(s) agora têm CashFlowEntry associado — abortando transação, NÃO apagar.`,
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
          "Limpeza de conta de teste (script one-off: cleanup-test-accounts-payable-2.ts) — sobra da integração WhatsApp/Z-API, sem SafeMovement nem CashFlowEntry associado.",
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
