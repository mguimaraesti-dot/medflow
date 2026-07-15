import { Prisma } from "@prisma/client";
import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  CashRegisterAlreadyOpenError,
  InsufficientSafeBalanceError,
  PreviousDayCashRegisterOpenError,
} from "@/core/errors/domain-error";
import { getBusinessDay } from "@/shared/lib/business-day";
import { formatDateOnlyBR } from "@/shared/lib/format";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { OpenCashRegisterInput } from "./dtos/open-cash-register.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  safeRepository: SafeRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

/** Mesmo default do schema (`OrganizationSettings.timezone`) — usado só se a organização não tiver configurações salvas. */
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * US02/US03 — Abertura de caixa.
 *
 * Motor de Tesouraria (ADR 2.8): `openingBalance` é sempre uma retirada
 * explícita do Cofre (`SafeMovement` tipo `FUNDING`, feita atomicamente
 * dentro de `cashRegisterDayRepository.create`) — substitui a herança
 * automática do `closingBalance` do dia anterior que existia na Sprint 1.
 * Não permite dois `CashRegisterDay` abertos no mesmo dia/organização.
 *
 * Também não permite abrir um novo caixa enquanto existir um `OPEN` de
 * uma data ANTERIOR (esquecido) — só bloquear a mesma data não pegava
 * esse caso (incidente real: caixa de 14/07 esquecido aberto, caixa
 * novo aberto em 15/07 por cima, dinheiro do 14/07 ficou no limbo até
 * regularização manual). Checagem roda ANTES da de mesma data.
 */
export async function openCashRegisterUseCase(
  input: OpenCashRegisterInput,
  openedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  const today = getBusinessDay(settings?.timezone ?? DEFAULT_TIMEZONE);

  const previousDayOpen =
    await deps.cashRegisterDayRepository.findOldestOpenBefore(
      organizationId,
      today,
    );
  if (previousDayOpen) {
    throw new PreviousDayCashRegisterOpenError(
      organizationId,
      formatDateOnlyBR(previousDayOpen.date),
    );
  }

  const existing =
    await deps.cashRegisterDayRepository.findByOrganizationAndDate(
      organizationId,
      today,
    );
  if (existing) {
    throw new CashRegisterAlreadyOpenError(organizationId, today.toISOString());
  }

  const openingBalance = new Prisma.Decimal(input.openingBalance.toFixed(2));
  const safeBalance = await deps.safeRepository.getBalance(organizationId);
  if (safeBalance.lessThan(openingBalance)) {
    throw new InsufficientSafeBalanceError(
      organizationId,
      openingBalance.toFixed(2),
      safeBalance.toFixed(2),
    );
  }

  const cashRegisterDay = await deps.cashRegisterDayRepository.create({
    organizationId,
    date: today,
    openingBalance: openingBalance.toFixed(2),
    openedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: openedByUserId,
      entity: "CashRegisterDay",
      entityId: cashRegisterDay.id,
      action: "CASH_REGISTER_OPENED",
      after: { openingBalance: openingBalance.toFixed(2) },
    },
  });

  logger.info("Caixa aberto", {
    organizationId,
    cashRegisterDayId: cashRegisterDay.id,
    openingBalance: openingBalance.toFixed(2),
  });

  return cashRegisterDay;
}
