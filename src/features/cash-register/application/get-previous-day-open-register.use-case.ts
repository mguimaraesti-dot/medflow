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
}

/**
 * Alimenta o aviso da tela de Caixa (Etapa 2 do bloqueio de abertura
 * com dia anterior) — a entidade INTEIRA, com `totalIn`/`cashIn`/
 * `expectedCashAmount` já calculados ao vivo via `computeLiveCashRegisterDay`
 * (mesmo helper de `getTodayCashRegisterUseCase`, mesma fórmula do
 * fechamento real). Corrigido depois do 1º commit desta PR: o dialog de
 * fechamento é o ÚNICO jeito de encerrar esse caixa esquecido, então
 * mostrar zeros ali (em vez do saldo real) faria a usuária declarar um
 * valor contado errado no exato momento em que o sistema mais precisa
 * ser confiável. NÃO usa `findOpenByOrganization` (reservado a
 * fechamento/sangria, semântica de "o mais recente").
 */
export async function getPreviousDayOpenRegisterUseCase(
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay | null> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  const today = getBusinessDay(settings?.timezone ?? DEFAULT_TIMEZONE);

  const found = await deps.cashRegisterDayRepository.findOldestOpenBefore(
    organizationId,
    today,
  );
  if (!found) return null;

  return computeLiveCashRegisterDay(found, deps);
}
