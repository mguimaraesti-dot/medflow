import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "../domain/accounts-payable-attachment.repository";
import type { AccountsPayableAttachment } from "../domain/accounts-payable-attachment.entity";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  attachmentRepository: AccountsPayableAttachmentRepository;
}

export async function listAccountsPayableAttachmentsUseCase(
  accountsPayableId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayableAttachment[]> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  return deps.attachmentRepository.listByAccountsPayableId(accountsPayableId);
}
