/**
 * Teste de integração do ciclo completo do Fluxo de Caixa:
 * abrir -> lançar entrada -> lançar saída -> estornar -> fechar ->
 * tentar lançar depois de fechado (deve falhar).
 *
 * PRÉ-REQUISITO — IMPORTANTE: precisa de um banco de dados de TESTE,
 * separado do banco de produção da Clínica MAE. Este teste CRIA E APAGA
 * dados de verdade. Nunca aponte DATABASE_URL_TEST para o banco real.
 *
 * Caminho mais simples para ter esse banco: criar um segundo projeto
 * gratuito no Supabase (ex: "MedFlow Test"), rodar as migrations nele:
 *
 *   DATABASE_URL="<pooler do projeto de teste>" \
 *   DIRECT_URL="<session pooler do projeto de teste>" \
 *   npx prisma migrate deploy
 *
 * E então rodar este teste com:
 *
 *   DATABASE_URL_TEST="<pooler do projeto de teste>" npm test
 *
 * Sem essa variável configurada, este arquivo é PULADO automaticamente
 * — não quebra o `npm test` no dia a dia.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const hasTestDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasTestDb)(
  "Ciclo completo do Fluxo de Caixa (integração)",
  () => {
    let testPrisma: PrismaClient;
    let organizationId: string;
    let userId: string;
    let categoryInId: string;
    let categoryOutId: string;
    let paymentMethodId: string;

    beforeAll(async () => {
      // Instanciado aqui dentro (não no corpo do describe) de propósito:
      // o corpo do describe roda mesmo quando skipIf está ativo (é só a
      // execução dos `it` que é pulada) — instanciar o PrismaClient ali
      // faria essa linha rodar mesmo sem DATABASE_URL_TEST configurada.
      testPrisma = new PrismaClient({
        datasources: { db: { url: process.env.DATABASE_URL_TEST } },
      });

      const role = await testPrisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN" },
      });

      const org = await testPrisma.organization.create({
        data: { name: `Org Teste ${Date.now()}` },
      });
      organizationId = org.id;

      const user = await testPrisma.user.create({
        data: {
          organizationId,
          name: "Usuário Teste",
          email: `teste-${Date.now()}@medflow.local`,
          supabaseAuthId: `test-${Date.now()}`,
          roleId: role.id,
        },
      });
      userId = user.id;

      const categoryIn = await testPrisma.category.create({
        data: { organizationId, name: "Receita Teste", type: "IN" },
      });
      categoryInId = categoryIn.id;

      const categoryOut = await testPrisma.category.create({
        data: { organizationId, name: "Despesa Teste", type: "OUT" },
      });
      categoryOutId = categoryOut.id;

      const paymentMethod = await testPrisma.paymentMethod.create({
        data: { organizationId, name: "PIX Teste" },
      });
      paymentMethodId = paymentMethod.id;

      // Motor de Tesouraria: abrir caixa retira o saldo inicial do Cofre —
      // precisa existir e ter saldo suficiente antes do primeiro caixa.
      const safe = await testPrisma.safe.create({ data: { organizationId } });
      await testPrisma.safeMovement.create({
        data: {
          organizationId,
          safeId: safe.id,
          type: "MANUAL_ADJUSTMENT",
          amount: "500.00",
          performedByUserId: userId,
          reason: "Saldo inicial de bootstrap (teste de integração)",
        },
      });
    });

    afterAll(async () => {
      await testPrisma.cashFlowEntry.deleteMany({ where: { organizationId } });
      await testPrisma.safeMovement.deleteMany({ where: { organizationId } });
      await testPrisma.safe.deleteMany({ where: { organizationId } });
      await testPrisma.cashRegisterDay.deleteMany({
        where: { organizationId },
      });
      await testPrisma.category.deleteMany({ where: { organizationId } });
      await testPrisma.paymentMethod.deleteMany({ where: { organizationId } });
      await testPrisma.user.deleteMany({ where: { organizationId } });
      await testPrisma.organization.delete({ where: { id: organizationId } });
      await testPrisma.$disconnect();
    });

    it("executa o ciclo completo (Caixa + Cofre) sem inconsistência de saldo", async () => {
      const { PrismaCashRegisterDayRepository } =
        await import("@/features/cash-register/infrastructure/prisma-cash-register-day.repository");
      const { PrismaCashFlowEntryRepository } =
        await import("@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository");
      const { PrismaSafeRepository } =
        await import("@/features/treasury/infrastructure/prisma-safe.repository");
      const { PrismaSafeMovementRepository } =
        await import("@/features/treasury/infrastructure/prisma-safe-movement.repository");
      const { PrismaOrganizationSettingsRepository } =
        await import("@/features/organization-settings/infrastructure/prisma-organization-settings.repository");
      const { openCashRegisterUseCase } =
        await import("@/features/cash-register/application/open-cash-register.use-case");
      const { createCashFlowEntryUseCase } =
        await import("@/features/cash-flow/application/create-cash-flow-entry.use-case");
      const { reverseCashFlowEntryUseCase } =
        await import("@/features/cash-flow/application/reverse-cash-flow-entry.use-case");
      const { closeCashRegisterUseCase } =
        await import("@/features/cash-register/application/close-cash-register.use-case");

      const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
      const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
      const safeRepository = new PrismaSafeRepository();
      const safeMovementRepository = new PrismaSafeMovementRepository();
      const organizationSettingsRepository =
        new PrismaOrganizationSettingsRepository();

      const day = await openCashRegisterUseCase(
        { openingBalance: 100 },
        userId,
        organizationId,
        {
          cashRegisterDayRepository,
          safeRepository,
          organizationSettingsRepository,
        },
      );
      expect(day.status).toBe("OPEN");

      await createCashFlowEntryUseCase(
        { type: "IN", amount: 200, categoryId: categoryInId, paymentMethodId },
        userId,
        organizationId,
        { cashFlowEntryRepository, cashRegisterDayRepository },
      );

      const expense = await createCashFlowEntryUseCase(
        { type: "OUT", amount: 50, categoryId: categoryOutId, paymentMethodId },
        userId,
        organizationId,
        { cashFlowEntryRepository, cashRegisterDayRepository },
      );

      const { reversal } = await reverseCashFlowEntryUseCase(
        expense.id,
        { description: "Motivo do estorno de teste" },
        userId,
        { cashFlowEntryRepository, cashRegisterDayRepository },
      );
      expect(reversal.type).toBe("IN");

      // Saldo contábil esperado: 100 (abertura) + 200 (entrada) - 50 (saída)
      // + 50 (estorno da saída) = 300. "PIX Teste" não é isCash, então o
      // Dinheiro Esperado (conferência física) fica só no valor de abertura.
      // Fecha direto pra CLOSED (dupla conferência removida).
      const closed = await closeCashRegisterUseCase(
        { countedAmount: 100 },
        userId,
        organizationId,
        {
          cashRegisterDayRepository,
          cashFlowEntryRepository,
          safeMovementRepository,
        },
      );
      expect(closed.status).toBe("CLOSED");
      expect(closed.expectedCashAmount?.toString()).toBe("100.00");
      expect(closed.closingBalance?.toString()).toBe("300.00");

      await expect(
        createCashFlowEntryUseCase(
          { type: "IN", amount: 10, categoryId: categoryInId, paymentMethodId },
          userId,
          organizationId,
          { cashFlowEntryRepository, cashRegisterDayRepository },
        ),
      ).rejects.toThrow();
    });
  },
);
