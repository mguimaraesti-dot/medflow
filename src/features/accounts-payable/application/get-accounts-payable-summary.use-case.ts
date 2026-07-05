import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayableSummary } from "../domain/accounts-payable-summary.entity";
import type { GetAccountsPayableSummaryInput } from "./dtos/accounts-payable-summary.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
}

export async function getAccountsPayableSummaryUseCase(
  input: GetAccountsPayableSummaryInput,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayableSummary> {
  return deps.accountsPayableRepository.getSummary(organizationId, {
    dueDateFrom: input.dueDateFrom,
    dueDateTo: input.dueDateTo,
  });
}
