import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashFlowEntryRepository } from "../domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "../domain/cash-flow-entry.entity";
import type { ListCashFlowEntriesInput } from "./dtos/list-cash-flow-entries.dto";

interface Deps {
  cashFlowEntryRepository: CashFlowEntryRepository;
}

export async function listCashFlowEntriesUseCase(
  input: ListCashFlowEntriesInput,
  organizationId: string,
  deps: Deps,
): Promise<PaginatedResult<CashFlowEntry>> {
  return deps.cashFlowEntryRepository.list(
    {
      organizationId,
      cashRegisterDayId: input.cashRegisterDayId,
      type: input.type,
      categoryId: input.categoryId,
    },
    { page: input.page, pageSize: input.pageSize },
  );
}
