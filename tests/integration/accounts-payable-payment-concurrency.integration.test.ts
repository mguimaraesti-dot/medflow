/**
 * Teste de integração da idempotência ATÔMICA de `markAsPaid` — prova que
 * duas chamadas quase simultâneas na MESMA conta (ex.: 👍 no boleto E no
 * Pix do mesmo lembrete, chegando quase juntas) resultam em exatamente
 * UMA baixa, nunca duas, e (para origem COFRE) em exatamente UM débito
 * de saldo. Mock de repositório não prova isso — só o Postgres de
 * verdade decidindo a corrida entre duas transações concorrentes prova.
 *
 * PRÉ-REQUISITO — IMPORTANTE (mesmo aviso de `cash-flow-cycle.integration.test.ts`):
 * precisa de um banco de dados de TESTE, separado do banco de produção
 * da Clínica MAE. Este teste CRIA E APAGA dados de verdade. Nunca aponte
 * DATABASE_URL_TEST para o banco real.
 *
 * Sem DATABASE_URL_TEST configurada, este arquivo é PULADO automaticamente
 * — não quebra o `npm test` no dia a dia.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const hasTestDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasTestDb)(
  "Idempotência atômica de markAsPaid (integração)",
  () => {
    let testPrisma: PrismaClient;
    let organizationId: string;
    let userId: string;
    let categoryId: string;
    let supplierId: string;
    let safeId: string;

    beforeAll(async () => {
      // Instanciado aqui dentro (não no corpo do describe) de propósito —
      // ver o mesmo comentário em cash-flow-cycle.integration.test.ts.
      testPrisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL_TEST } },
      });

      const role = await testPrisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" },
      });

      const org = await testPrisma.organization.create({
        data: { name: `Org Teste Concorrência ${Date.now()}` },
      });
      organizationId = org.id;

      const user = await testPrisma.user.create({
        data: {
          organizationId,
          name: "Usuário Teste",
          email: `teste-concorrencia-${Date.now()}@medflow.local`,
          supabaseAuthId: `test-concorrencia-${Date.now()}`,
          roleId: role.id,
        },
      });
      userId = user.id;

      const category = await testPrisma.category.create({
        data: { organizationId, name: "Despesa Teste", type: "OUT" },
      });
      categoryId = category.id;

      const supplier = await testPrisma.supplier.create({
        data: { organizationId, name: "Fornecedor Teste" },
      });
      supplierId = supplier.id;

      const safe = await testPrisma.safe.create({ data: { organizationId } });
      safeId = safe.id;
      await testPrisma.safeMovement.create({
        data: {
          organizationId,
          safeId,
          type: "MANUAL_ADJUSTMENT",
          amount: "1000.00",
          performedByUserId: userId,
          reason: "Saldo inicial de bootstrap (teste de integração)",
        },
      });
    });

    afterAll(async () => {
      await testPrisma.safeMovement.deleteMany({ where: { organizationId } });
      await testPrisma.safe.deleteMany({ where: { organizationId } });
      await testPrisma.accountsPayable.deleteMany({
        where: { organizationId },
      });
      await testPrisma.supplier.deleteMany({ where: { organizationId } });
      await testPrisma.category.deleteMany({ where: { organizationId } });
      await testPrisma.user.deleteMany({ where: { organizationId } });
      await testPrisma.organization.delete({ where: { id: organizationId } });
      await testPrisma.$disconnect();
    });

    it("BANCO: 2 chamadas simultâneas de markAsPaid na mesma conta PENDING — exatamente 1 sucesso, 1 rejeição, conta paga uma única vez", async () => {
      const { PrismaAccountsPayableRepository } =
        await import("@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository");
      const { PayableAlreadyProcessedError } =
        await import("@/core/errors/domain-error");
      const repository = new PrismaAccountsPayableRepository();

      const payable = await testPrisma.accountsPayable.create({
        data: {
          organizationId,
          supplierId,
          categoryId,
          description: "Conta BANCO — teste de corrida",
          amount: "150.00",
          dueDate: new Date(),
          paymentOrigin: "BANCO",
          createdByUserId: userId,
        },
      });

      const call = () =>
        repository.markAsPaid(payable.id, {
          paidByUserId: userId,
          paidVia: "SYSTEM",
          paymentOrigin: "BANCO",
          amount: "150.00",
          organizationId,
        });

      const results = await Promise.allSettled([call(), call()]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        PayableAlreadyProcessedError,
      );

      const finalRow = await testPrisma.accountsPayable.findUniqueOrThrow({
        where: { id: payable.id },
      });
      expect(finalRow.status).toBe("PAID");
    });

    it("COFRE: 2 reações simultâneas na mesma conta — exatamente 1 baixa, 1 SafeMovement, saldo debitado uma única vez (não duas)", async () => {
      const { PrismaAccountsPayableRepository } =
        await import("@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository");
      const { PrismaSafeRepository } =
        await import("@/features/treasury/infrastructure/prisma-safe.repository");
      const { PayableAlreadyProcessedError } =
        await import("@/core/errors/domain-error");
      const repository = new PrismaAccountsPayableRepository();
      const safeRepository = new PrismaSafeRepository();

      const payable = await testPrisma.accountsPayable.create({
        data: {
          organizationId,
          supplierId,
          categoryId,
          description: "Conta COFRE — teste de corrida",
          amount: "300.00",
          dueDate: new Date(),
          paymentOrigin: "COFRE",
          createdByUserId: userId,
        },
      });

      // As duas chamadas partem do MESMO saldo (1000.00) — exatamente o
      // cenário real: duas reações quase simultâneas, cada uma já
      // calculou o saldo ANTES de qualquer uma commitar. Se a proteção
      // fosse só o `if (status !== PENDING)` em memória (o bug antigo),
      // as duas passariam e debitariam o Cofre duas vezes.
      const call = () =>
        repository.markAsPaid(payable.id, {
          paidByUserId: userId,
          paidVia: "WHATSAPP",
          paymentOrigin: "COFRE",
          amount: "300.00",
          organizationId,
          safeBalance: "1000.00",
        });

      const results = await Promise.allSettled([call(), call()]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        PayableAlreadyProcessedError,
      );

      const finalRow = await testPrisma.accountsPayable.findUniqueOrThrow({
        where: { id: payable.id },
      });
      expect(finalRow.status).toBe("PAID");

      const movements = await testPrisma.safeMovement.findMany({
        where: {
          organizationId,
          type: "ACCOUNTS_PAYABLE_PAYMENT",
          relatedAccountsPayableId: payable.id,
        },
      });
      expect(movements).toHaveLength(1);

      // Saldo final: 1000 (inicial) - 300 (esta conta) = 700. Se o débito
      // tivesse duplicado, daria 400.
      const finalBalance = await safeRepository.getBalance(organizationId);
      expect(finalBalance.toFixed(2)).toBe("700.00");
    });
  },
);
