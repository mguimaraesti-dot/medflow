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
    });

    afterAll(async () => {
      await testPrisma.cashFlowEntry.deleteMany({ where: { organizationId } });
      await testPrisma.cashRegisterDay.deleteMany({
        where: { organizationId },
      });
      await testPrisma.category.deleteMany({ where: { organizationId } });
      await testPrisma.paymentMethod.deleteMany({ where: { organizationId } });
      await testPrisma.user.deleteMany({ where: { organizationId } });
      await testPrisma.organization.delete({ where: { id: organizationId } });
      await testPrisma.$disconnect();
    });

    it("executa o ciclo completo sem inconsistência de saldo", async () => {
      const { PrismaCashRegisterDayRepository } =
        await import("@/features/cash-register/infrastructure/prisma-cash-register-day.repository");
      const { PrismaCashFlowEntryRepository } =
        await import("@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository");
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

      const day = await openCashRegisterUseCase(
        { openingBalance: 100 },
        userId,
        organizationId,
        { cashRegisterDayRepository },
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
        {},
        userId,
        { cashFlowEntryRepository, cashRegisterDayRepository },
      );
      expect(reversal.type).toBe("IN");

      // Esperado: 100 (abertura) + 200 (entrada) - 50 (saída) + 50 (estorno da saída) = 300
      const closed = await closeCashRegisterUseCase(userId, organizationId, {
        cashRegisterDayRepository,
        cashFlowEntryRepository,
      });

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
