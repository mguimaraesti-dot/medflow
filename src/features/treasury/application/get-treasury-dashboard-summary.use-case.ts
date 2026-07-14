import { startOfDayInTz, endOfDayInTz } from "@/shared/lib/business-day";
import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { TreasuryDashboardSummaryResponseDTO } from "./dtos/treasury-dashboard-summary.response-dto";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
}

/**
 * Mesmo default de `OrganizationSettings.timezone` usado em outros
 * pontos do sistema (MVP opera com uma única clínica, ver CLAUDE.md).
 */
const TIMEZONE = "America/Sao_Paulo";

/**
 * Agrega os indicadores da Tesouraria — não mexe no contrato de
 * `get-safe-summary.use-case` (reusado em outros lugares). `range`
 * escopa entradas/saídas: sem ele, é "hoje" (cards do cabeçalho); com um
 * range explícito, serve o Resumo do Período. Pendentes/Última
 * Conferência nunca são escopados por período — são sempre o estado
 * atual.
 */
export async function getTreasuryDashboardSummaryUseCase(
  organizationId: string,
  deps: Deps,
  range?: { from: Date; to: Date },
): Promise<TreasuryDashboardSummaryResponseDTO> {
  const from = range?.from ?? startOfDayInTz(new Date(), TIMEZONE);
  const to = range?.to ?? endOfDayInTz(new Date(), TIMEZONE);

  const [balance, periodSums, pending, lastConfirmed] = await Promise.all([
    deps.safeRepository.getBalance(organizationId),
    deps.safeMovementRepository.sumSignedByDateRangeAndStatus(
      organizationId,
      from,
      to,
      "CONFIRMED",
    ),
    deps.safeMovementRepository.countAndSumPending(organizationId),
    deps.safeMovementRepository.findLastConfirmed(organizationId),
  ]);

  return {
    balance: balance.toFixed(2),
    periodIn: periodSums.in,
    periodOut: periodSums.out,
    pendingCount: pending.count,
    pendingSum: pending.sum,
    lastConfirmedAt: lastConfirmed?.confirmedAt?.toISOString() ?? null,
    lastConfirmedByUserName: lastConfirmed?.confirmedByUserName ?? null,
  };
}
