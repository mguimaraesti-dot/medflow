import { Prisma } from "@prisma/client";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
  cashFlowEntryRepository: CashFlowEntryRepository;
  /** Injetado só para permitir teste determinístico — em produção é sempre `new Date()`. */
  referenceDate?: Date;
}

/**
 * Enquanto o caixa está OPEN, `totalIn`/`totalOut` ainda não existem no
 * banco (só são gravados no fechamento) — aqui completamos com a soma
 * ao vivo (mesmo `sumByCashRegisterDay` já usado pra fechar o caixa e
 * pelo Dashboard), pra a UI poder mostrar "Entradas"/"Saídas" do dia
 * mesmo com o caixa ainda aberto.
 */
export async function getTodayCashRegisterUseCase(
  organizationId: string,
  deps: Deps,
): Promise<CashRegisterDay | null> {
  const today = new Date(deps.referenceDate ?? new Date());
  today.setUTCHours(0, 0, 0, 0);

  const day = await deps.cashRegisterDayRepository.findByOrganizationAndDate(
    organizationId,
    today,
  );
  if (!day) return null;

  if (day.status === "OPEN") {
    const sums = await deps.cashFlowEntryRepository.sumByCashRegisterDay(
      day.id,
    );
    return {
      ...day,
      totalIn: new Prisma.Decimal(sums.totalIn),
      totalOut: new Prisma.Decimal(sums.totalOut),
    };
  }

  return day;
}
