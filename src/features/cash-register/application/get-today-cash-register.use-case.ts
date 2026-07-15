import { getBusinessDay } from "@/shared/lib/business-day";
import { computeLiveCashRegisterDay } from "./compute-live-cash-register-day";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

/** Mesmo default do schema (`OrganizationSettings.timezone`) — usado só se a organização não tiver configurações salvas. */
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  safeMovementRepository: SafeMovementRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

/**
 * Enquanto o caixa está OPEN, `totalIn`/`totalOut`/`expectedCashAmount`
 * ainda não existem no banco (só são gravados no fechamento) — aqui
 * completamos com a soma ao vivo, pra a UI poder mostrar o resumo do
 * dia (inclusive o Saldo Esperado em Dinheiro, que só conta espécie)
 * mesmo com o caixa ainda aberto. Mesma fórmula usada em
 * `close-cash-register.use-case.ts`: Saldo Inicial + Entradas em
 * dinheiro − Saídas em dinheiro − Sangrias — PIX/cartão nunca entram
 * aqui, só no `totalIn`/`totalOut` contábil (todas as formas).
 */
export async function getTodayCashRegisterUseCase(
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay | null> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  const today = getBusinessDay(
    settings?.timezone ?? DEFAULT_TIMEZONE,
    deps.referenceDate ?? new Date(),
  );

  const day = await deps.cashRegisterDayRepository.findByOrganizationAndDate(
    organizationId,
    today,
  );
  if (!day) return null;

  return computeLiveCashRegisterDay(day, deps);
}
