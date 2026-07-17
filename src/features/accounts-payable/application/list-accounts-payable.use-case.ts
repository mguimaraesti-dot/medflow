import type { PaginatedResult } from "@/shared/lib/pagination";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { ListAccountsPayableInput } from "./dtos/list-accounts-payable.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

export async function listAccountsPayableUseCase(
  input: ListAccountsPayableInput,
  organizationId: string,
  deps: Deps,
): Promise<PaginatedResult<AccountsPayable>> {
  return deps.accountsPayableRepository.list(
    {
      organizationId,
      status: input.status,
      dueDateFrom: input.dueDateFrom,
      dueDateTo: input.dueDateTo,
      supplierId: input.supplierId,
      categoryId: input.categoryId,
      recurringBillId: input.recurringBillId,
      recurringOnly: input.recurringOnly,
      search: input.search,
      deletedOnly: input.deletedOnly,
      pendingReminderOnly: input.pendingReminderOnly,
    },
    { page: input.page, pageSize: input.pageSize },
  );
}
