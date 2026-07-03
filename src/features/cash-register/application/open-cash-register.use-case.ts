import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterAlreadyOpenError,
  FirstUseRequiresOpeningBalanceError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { OpenCashRegisterInput } from "./dtos/open-cash-register.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * US02/US03 — Abertura de caixa.
 * - Primeiro uso do sistema: exige `openingBalance` no input.
 * - Demais dias: ignora `openingBalance` do input (mesmo se enviado) e
 *   herda automaticamente o `closingBalance` do último caixa fechado —
 *   nenhuma digitação manual, por decisão de produto já registrada.
 * - Não permite dois `CashRegisterDay` abertos no mesmo dia/organização.
 */
export async function openCashRegisterUseCase(
  input: OpenCashRegisterInput,
  openedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const today = startOfDayUTC(new Date());

  const existing =
    await deps.cashRegisterDayRepository.findByOrganizationAndDate(
      organizationId,
      today,
    );
  if (existing) {
    throw new CashRegisterAlreadyOpenError(organizationId, today.toISOString());
  }

  const lastClosed =
    await deps.cashRegisterDayRepository.findLastClosed(organizationId);

  let openingBalance: string;

  if (lastClosed) {
    openingBalance = lastClosed.closingBalance?.toFixed(2) ?? "0.00";
  } else {
    if (input.openingBalance === undefined) {
      throw new FirstUseRequiresOpeningBalanceError();
    }
    openingBalance = input.openingBalance.toFixed(2);
  }

  const cashRegisterDay = await deps.cashRegisterDayRepository.create({
    organizationId,
    date: today,
    openingBalance,
    openedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: openedByUserId,
      entity: "CashRegisterDay",
      entityId: cashRegisterDay.id,
      action: "CASH_REGISTER_OPENED",
      after: { openingBalance },
    },
  });

  logger.info("Caixa aberto", {
    organizationId,
    cashRegisterDayId: cashRegisterDay.id,
    openingBalance,
  });

  return cashRegisterDay;
}
