import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "../domain/cash-flow-entry.entity";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CreateCashFlowEntryInput } from "./dtos/create-cash-flow-entry.dto";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/**
 * US04/US05 — Registrar entrada e registrar saída.
 *
 * Decisão de design: um único use case parametrizado por `input.type`
 * ("IN" | "OUT"), em vez de dois use cases separados. As regras de
 * negócio (precisa de caixa aberto, gera auditoria, log) são idênticas
 * para os dois casos — a única diferença é o sinal. Duplicar o use case
 * só para ter nomes "registerIncome" / "registerExpense" criaria dois
 * lugares para manter a mesma regra sincronizada, contrariando DRY sem
 * ganho real de clareza (o `type` já está bem explícito no DTO).
 */
export async function createCashFlowEntryUseCase(
  input: CreateCashFlowEntryInput,
  createdByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashFlowEntry> {
  const openRegister =
    await deps.cashRegisterDayRepository.findOpenByOrganization(organizationId);
  if (!openRegister) {
    throw new CashRegisterNotOpenError(organizationId);
  }

  const entry = await deps.cashFlowEntryRepository.create({
    organizationId,
    cashRegisterDayId: openRegister.id,
    type: input.type,
    amount: input.amount.toFixed(2),
    description: input.description,
    occurredAt: input.occurredAt,
    categoryId: input.categoryId,
    paymentMethodId: input.paymentMethodId,
    createdByUserId,
    patientName: input.patientName,
    withdrawalReason: input.withdrawalReason,
  });

  await prisma.auditLog.create({
    data: {
      userId: createdByUserId,
      entity: "CashFlowEntry",
      entityId: entry.id,
      action: "CREATE",
      after: {
        type: entry.type,
        amount: input.amount.toFixed(2),
        patientName: input.patientName,
        withdrawalReason: input.withdrawalReason,
      },
    },
  });

  logger.info("Lançamento de caixa criado", {
    organizationId,
    cashFlowEntryId: entry.id,
    cashRegisterDayId: openRegister.id,
    type: entry.type,
  });

  return entry;
}
