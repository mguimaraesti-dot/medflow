import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

/**
 * ONE-OFF — regulariza o `CashRegisterDay` de 14/07/2026, esquecido em
 * OPEN (a recepcionista abriu um caixa novo em 15/07 por cima, sem
 * fechar o anterior — o dinheiro do 14/07 ficou "no limbo": não voltou
 * pro Cofre e não está em nenhum caixa fechado). Fecha pelo VALOR
 * ESPERADO calculado pelo próprio sistema (sem contagem física),
 * gerando o `SafeMovement` `CASH_REGISTER_HANDOFF`/`PENDING` de praxe,
 * aguardando confirmação do Gerente — exatamente como um fechamento
 * normal, só que retroativo.
 *
 * A lógica aqui REPLICA (não chama) `close-cash-register.use-case.ts` +
 * `prisma-cash-register-day.repository.ts` (`close()`), usando Prisma
 * puro em vez dos imports com alias `@/...` — assim o script roda com
 * `tsx` isolado, sem depender de nenhuma configuração extra de
 * tsconfig/paths (mesmo padrão já usado em `prisma/seed.ts`).
 *
 * ⚠️ NUNCA usa `closeCashRegisterUseCase` nem `findOpenByOrganization`:
 * os dois resolvem pro caixa aberto mais RECENTE (o de 15/07), o que
 * fecharia o dia ERRADO. O alvo aqui é resolvido só pela DATA EXATA
 * (`organizationId_date`, o mesmo índice único que
 * `findByOrganizationAndDate` usa).
 *
 * DRY-RUN POR PADRÃO — calcula e imprime tudo, não grava nada. Só
 * grava com `--execute`.
 *
 * Uso:
 *   npx tsx scripts/regularizar-caixa-2026-07-14.ts --user=<id do gerente/admin>
 *     → dry-run (não grava nada)
 *   npx tsx scripts/regularizar-caixa-2026-07-14.ts --user=<id> --execute
 *     → grava de verdade
 *   npx tsx scripts/regularizar-caixa-2026-07-14.ts --user=<id> --org=<organizationId>
 *     → só necessário se existir mais de uma Organization no banco
 *       (MVP é mono-organização; sem --org, o script exige que exista
 *       exatamente uma)
 */

const prisma = new PrismaClient();

// Data-alvo do CashRegisterDay a regularizar — único lugar que precisa
// mudar se este script for reaproveitado pra outro dia esquecido.
const TARGET_DATE_ISO = "2026-07-14";

function parseArgs() {
  const args = process.argv.slice(2);
  const execute = args.includes("--execute");
  const userArg = args.find((arg) => arg.startsWith("--user="));
  const orgArg = args.find((arg) => arg.startsWith("--org="));
  return {
    execute,
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

async function main() {
  const { execute, userId, organizationId } = parseArgs();

  if (!userId) {
    console.error(
      "Faltou --user=<id>. Informe o id do usuário (Gerente/Admin) responsável por esta regularização — ele vira closedByUserId no CashRegisterDay e performedByUserId no SafeMovement.\n" +
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

  console.log("=== Regularização de Caixa Esquecido — 14/07/2026 ===");
  console.log(`Organização : ${organization.name} (${organization.id})`);
  console.log(`Data-alvo   : ${TARGET_DATE_ISO}`);
  console.log(`Executado por: ${performingUser.name} (${performingUser.id})`);
  console.log(
    `Modo        : ${execute ? "EXECUÇÃO (vai gravar)" : "DRY-RUN (só leitura)"}`,
  );
  console.log("");

  const targetDate = new Date(`${TARGET_DATE_ISO}T00:00:00.000Z`);

  // --- Guarda 1: o registro do dia-alvo existe? ---
  const cashRegisterDay = await prisma.cashRegisterDay.findUnique({
    where: {
      organizationId_date: {
        organizationId: organization.id,
        date: targetDate,
      },
    },
  });

  if (!cashRegisterDay) {
    console.error(
      `Nenhum CashRegisterDay encontrado para ${organization.name} em ${TARGET_DATE_ISO}. Abortando — nada a regularizar.`,
    );
    process.exit(1);
  }

  console.log("CashRegisterDay encontrado:");
  console.log(`  id             : ${cashRegisterDay.id}`);
  console.log(`  date           : ${cashRegisterDay.date.toISOString()}`);
  console.log(`  status         : ${cashRegisterDay.status}`);
  console.log(
    `  openingBalance : ${cashRegisterDay.openingBalance.toFixed(2)}`,
  );
  console.log("");

  // --- Guarda 2: precisa estar OPEN (idempotência — não fechar 2x) ---
  if (cashRegisterDay.status !== "OPEN") {
    console.error(
      `CashRegisterDay já está ${cashRegisterDay.status} (esperado OPEN). Abortando — já deve ter sido regularizado ou fechado normalmente antes. Rodar este script de novo não é seguro.`,
    );
    process.exit(1);
  }

  // --- Guarda 3: a data do registro encontrado bate com a data-alvo? ---
  const foundDateISO = cashRegisterDay.date.toISOString().slice(0, 10);
  if (foundDateISO !== TARGET_DATE_ISO) {
    console.error(
      `Inconsistência: o registro encontrado tem date=${foundDateISO}, diferente da data-alvo (${TARGET_DATE_ISO}). Abortando — não fechar o dia errado.`,
    );
    process.exit(1);
  }

  // --- Guarda 4: já existe algum handoff pra esse dia? ---
  const existingHandoff = await prisma.safeMovement.findFirst({
    where: {
      relatedCashRegisterDayId: cashRegisterDay.id,
      type: "CASH_REGISTER_HANDOFF",
    },
  });
  if (existingHandoff) {
    console.error(
      `Já existe um SafeMovement CASH_REGISTER_HANDOFF para este CashRegisterDay (id: ${existingHandoff.id}, status: ${existingHandoff.status}, amount: ${existingHandoff.amount.toFixed(2)}). ` +
        "Situação inesperada (pode indicar um fechamento/reabertura anterior que a investigação não previu) — abortando pra revisão manual, não seguir automaticamente.",
    );
    process.exit(1);
  }

  // --- Cálculo (mesma fórmula de close-cash-register.use-case.ts:68-76) ---
  const [
    cashInAgg,
    cashOutAgg,
    sangriaAgg,
    alreadyHandedOffAgg,
    allInAgg,
    allOutAgg,
  ] = await Promise.all([
    prisma.cashFlowEntry.aggregate({
      where: {
        cashRegisterDayId: cashRegisterDay.id,
        type: "IN",
        paymentMethod: { isCash: true },
      },
      _sum: { amount: true },
    }),
    prisma.cashFlowEntry.aggregate({
      where: {
        cashRegisterDayId: cashRegisterDay.id,
        type: "OUT",
        paymentMethod: { isCash: true },
      },
      _sum: { amount: true },
    }),
    prisma.safeMovement.aggregate({
      where: { relatedCashRegisterDayId: cashRegisterDay.id, type: "SANGRIA" },
      _sum: { amount: true },
    }),
    prisma.safeMovement.aggregate({
      where: {
        relatedCashRegisterDayId: cashRegisterDay.id,
        type: "CASH_REGISTER_HANDOFF",
        status: "CONFIRMED",
      },
      _sum: { amount: true },
    }),
    prisma.cashFlowEntry.aggregate({
      where: { cashRegisterDayId: cashRegisterDay.id, type: "IN" },
      _sum: { amount: true },
    }),
    prisma.cashFlowEntry.aggregate({
      where: { cashRegisterDayId: cashRegisterDay.id, type: "OUT" },
      _sum: { amount: true },
    }),
  ]);

  const openingBalance = new Prisma.Decimal(cashRegisterDay.openingBalance);
  const cashIn = cashInAgg._sum.amount ?? new Prisma.Decimal(0);
  const cashOut = cashOutAgg._sum.amount ?? new Prisma.Decimal(0);
  const sangriaTotal = sangriaAgg._sum.amount ?? new Prisma.Decimal(0);
  const alreadyHandedOff =
    alreadyHandedOffAgg._sum.amount ?? new Prisma.Decimal(0);
  const totalIn = allInAgg._sum.amount ?? new Prisma.Decimal(0);
  const totalOut = allOutAgg._sum.amount ?? new Prisma.Decimal(0);

  const expectedCashAmount = openingBalance
    .plus(cashIn)
    .minus(cashOut)
    .minus(sangriaTotal);

  // --- Guarda 5: alreadyHandedOff deve ser zero pro 14/07 ---
  if (!alreadyHandedOff.equals(new Prisma.Decimal(0))) {
    console.error(
      `alreadyHandedOff (soma de CASH_REGISTER_HANDOFF CONFIRMED já ligado a este dia) = ${alreadyHandedOff.toFixed(2)}, esperado 0.00. ` +
        "Situação inesperada (a Guarda 4 já deveria ter pego isso, mas a conta não bate) — abortando pra revisão manual.",
    );
    process.exit(1);
  }

  // Fecha pelo valor esperado — sem contagem física, difference = 0.
  const countedAmount = expectedCashAmount;
  const difference = new Prisma.Decimal(0);
  const handoffAmount = countedAmount.minus(alreadyHandedOff); // = countedAmount (alreadyHandedOff é 0)
  const closingBalance = openingBalance.plus(totalIn).minus(totalOut);

  const nowLabel = new Date().toISOString();
  const closureNote =
    `Regularização retroativa — caixa do dia 14/07 permaneceu aberto por ` +
    `esquecimento e o sistema exibia "caixa fechado" na manhã seguinte ` +
    `(a tela considera apenas o dia atual). Valor conferido fisicamente ` +
    `pela recepcionista em 15/07: R$ 40,00 de abertura + R$ 60,00 de venda ` +
    `de Kit = R$ 100,00, coincidente com o valor esperado calculado pelo ` +
    `sistema. Fechado retroativamente em ${nowLabel}.`;

  console.log("=== CÁLCULO (Dinheiro Esperado) ===");
  console.log(`  openingBalance        : ${openingBalance.toFixed(2)}`);
  console.log(`+ cashIn (dinheiro)     : ${cashIn.toFixed(2)}`);
  console.log(`- cashOut (dinheiro)    : ${cashOut.toFixed(2)}`);
  console.log(`- sangriaTotal          : ${sangriaTotal.toFixed(2)}`);
  console.log(`= expectedCashAmount    : ${expectedCashAmount.toFixed(2)}`);
  console.log("");
  console.log("=== Totais contábeis (todas as formas de pagamento) ===");
  console.log(`  totalIn               : ${totalIn.toFixed(2)}`);
  console.log(`  totalOut              : ${totalOut.toFixed(2)}`);
  console.log(`  closingBalance        : ${closingBalance.toFixed(2)}`);
  console.log("");
  console.log("=== O QUE SERIA GRAVADO ===");
  console.log("CashRegisterDay (update):");
  console.log(`  status              : CLOSED`);
  console.log(`  closedAt            : ${nowLabel} (agora)`);
  console.log(
    `  closedByUserId      : ${performingUser.id} (${performingUser.name})`,
  );
  console.log(`  expectedCashAmount  : ${expectedCashAmount.toFixed(2)}`);
  console.log(`  countedAmount       : ${countedAmount.toFixed(2)}`);
  console.log(`  difference          : ${difference.toFixed(2)}`);
  console.log(`  totalIn             : ${totalIn.toFixed(2)}`);
  console.log(`  totalOut            : ${totalOut.toFixed(2)}`);
  console.log(`  closingBalance      : ${closingBalance.toFixed(2)}`);
  console.log(`  closureNote         : ${closureNote}`);
  console.log("SafeMovement (create):");
  console.log(`  type                : CASH_REGISTER_HANDOFF`);
  console.log(`  status              : PENDING`);
  console.log(`  amount              : ${handoffAmount.toFixed(2)}`);
  console.log(`  relatedCashRegisterDayId: ${cashRegisterDay.id}`);
  console.log(
    `  performedByUserId   : ${performingUser.id} (${performingUser.name})`,
  );
  console.log(
    `  createdAt           : ${nowLabel} (agora, default do schema — não retroagido)`,
  );
  console.log("AuditLog (create):");
  console.log(`  entity/action       : CashRegisterDay / CASH_REGISTER_CLOSED`);
  console.log("");

  if (!execute) {
    console.log(
      ">>> DRY-RUN — nada foi gravado. Rode com --execute para aplicar. <<<",
    );
    await prisma.$disconnect();
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const safe = await tx.safe.findUniqueOrThrow({
      where: { organizationId: organization.id },
    });

    const updatedDay = await tx.cashRegisterDay.update({
      where: { id: cashRegisterDay.id },
      data: {
        status: "CLOSED",
        expectedCashAmount: expectedCashAmount.toFixed(2),
        countedAmount: countedAmount.toFixed(2),
        difference: difference.toFixed(2),
        totalIn: totalIn.toFixed(2),
        totalOut: totalOut.toFixed(2),
        closingBalance: closingBalance.toFixed(2),
        closureNote,
        closedByUserId: performingUser.id,
        closedAt: new Date(),
      },
    });

    const handoff = await tx.safeMovement.create({
      data: {
        organizationId: organization.id,
        safeId: safe.id,
        type: "CASH_REGISTER_HANDOFF",
        status: "PENDING",
        amount: handoffAmount.toFixed(2),
        relatedCashRegisterDayId: cashRegisterDay.id,
        performedByUserId: performingUser.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: performingUser.id,
        entity: "CashRegisterDay",
        entityId: updatedDay.id,
        action: "CASH_REGISTER_CLOSED",
        after: {
          expectedCashAmount: expectedCashAmount.toFixed(2),
          countedAmount: countedAmount.toFixed(2),
          difference: difference.toFixed(2),
          handoffAmount: handoffAmount.toFixed(2),
          regularization: "chore/regularizar-caixa-14-07 (script one-off)",
        },
      },
    });

    return { updatedDay, handoff };
  });

  console.log("=== EXECUTADO ===");
  console.log(
    `CashRegisterDay ${result.updatedDay.id} fechado (status: ${result.updatedDay.status}, closedAt: ${result.updatedDay.closedAt?.toISOString()}).`,
  );
  console.log(
    `SafeMovement ${result.handoff.id} criado (CASH_REGISTER_HANDOFF, status PENDING, amount ${result.handoff.amount.toFixed(2)}).`,
  );
  console.log("");
  console.log(
    "O handoff está PENDENTE — um Gerente precisa confirmar a conferência na tela de Tesouraria para o valor entrar no saldo do Cofre.",
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Erro:", error);
  await prisma.$disconnect();
  process.exit(1);
});
