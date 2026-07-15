import { toMoneyString } from "@/shared/lib/money";
import { getBusinessDay } from "@/shared/lib/business-day";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

/** Mesmo default do schema (`OrganizationSettings.timezone`) — usado só se a organização não tiver configurações salvas. */
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  organizationSettingsRepository: OrganizationSettingsRepository;
}

export interface PreviousDayOpenRegisterInfo {
  id: string;
  date: Date;
  openingBalance: string;
}

/**
 * Alimenta o aviso da tela de Caixa (Etapa 2 do bloqueio de abertura
 * com dia anterior) — projeção mínima (id/date/openingBalance), não a
 * entidade inteira, só pra: (1) o cabeçalho parar de dizer "Caixa
 * Fechado" quando na verdade existe um caixa esquecido aberto de outro
 * dia, e (2) oferecer o botão de fechar. NÃO usa `findOpenByOrganization`
 * (reservado a fechamento/sangria, semântica de "o mais recente").
 */
export async function getPreviousDayOpenRegisterUseCase(
  organizationId: string,
  deps: Deps,
): Promise<PreviousDayOpenRegisterInfo | null> {
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

  return {
    id: found.id,
    date: found.date,
    openingBalance: toMoneyString(found.openingBalance) as string,
  };
}
