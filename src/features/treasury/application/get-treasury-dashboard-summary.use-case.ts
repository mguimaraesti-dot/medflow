import type { SafeRepository } from "../domain/safe.repository";
import type { SafeMovementRepository } from "../domain/safe-movement.repository";
import type { TreasuryDashboardSummaryResponseDTO } from "./dtos/treasury-dashboard-summary.response-dto";

interface Deps {
  safeRepository: SafeRepository;
  safeMovementRepository: SafeMovementRepository;
}

function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function endOfTodayUTC(): Date {
  const start = startOfTodayUTC();
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

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
  const from = range?.from ?? startOfTodayUTC();
  const to = range?.to ?? endOfTodayUTC();

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
