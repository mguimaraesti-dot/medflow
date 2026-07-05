import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashRegisterDayRepository } from "../domain/cash-register-day.repository";
import type { CashRegisterDay } from "../domain/cash-register-day.entity";
import type { ListCashRegisterDaysInput } from "./dtos/list-cash-register-days.dto";

interface Deps {
  cashRegisterDayRepository: CashRegisterDayRepository;
}

/** Histórico de fechamentos — usado pelo Relatório de Fechamento Diário (Sprint 3). */
export async function listCashRegisterDaysUseCase(
  input: ListCashRegisterDaysInput,
  organizationId: string,
  deps: Deps,
): Promise<PaginatedResult<CashRegisterDay>> {
  return deps.cashRegisterDayRepository.list(
    {
      organizationId,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    },
    { page: input.page, pageSize: input.pageSize },
  );
}
