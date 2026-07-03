import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterClosedError,
  DuplicateReversalError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "../domain/cash-flow-entry.entity";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { ReverseCashFlowEntryInput } from "./dtos/reverse-cash-flow-entry.dto";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
  cashRegisterDayRepository: CashRegisterDayRepository;
}

interface ReverseResult {
  original: CashFlowEntry;
  reversal: CashFlowEntry;
}

/**
 * US06 — Estorno de lançamento.
 * A checagem de "já foi estornado" acontece aqui (para dar erro rápido e
 * ser testável com mock) E de novo dentro da transação do repositório
 * (rede de segurança contra corrida entre duas requisições simultâneas —
 * ver comentário em PrismaCashFlowEntryRepository.reverse).
 */
export async function reverseCashFlowEntryUseCase(
  entryId: string,
  input: ReverseCashFlowEntryInput,
  reversedByUserId: string,
  deps: Deps,
): Promise<ReverseResult> {
  const original = await deps.cashFlowEntryRepository.findById(entryId);
  if (!original) {
    throw new NotFoundError("Lançamento", entryId);
  }

  if (original.isReversed) {
    throw new DuplicateReversalError(entryId);
  }

  const cashRegisterDay = await deps.cashRegisterDayRepository.findById(
    original.cashRegisterDayId,
  );
  if (!cashRegisterDay || cashRegisterDay.status !== "OPEN") {
    throw new CashRegisterClosedError(original.cashRegisterDayId);
  }

  const result = await deps.cashFlowEntryRepository.reverse(
    entryId,
    reversedByUserId,
    input.description,
  );

  await prisma.auditLog.create({
    data: {
      userId: reversedByUserId,
      entity: "CashFlowEntry",
      entityId: entryId,
      action: "REVERSAL",
      after: { reversalEntryId: result.reversal.id },
    },
  });

  logger.info("Lançamento estornado", {
    cashFlowEntryId: entryId,
    reversalEntryId: result.reversal.id,
    reversedByUserId,
  });

  return result;
}
