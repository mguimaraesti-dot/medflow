import type { AccountsPayableAttachment } from "./accounts-payable-attachment.entity";

export interface CreateAccountsPayableAttachmentInput {
  organizationId: string;
  accountsPayableId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
}

/**
 * Contrato do repositório de anexos — exclusão é sempre física (nunca
 * soft delete, diferente de `AccountsPayable`): um anexo removido não
 * tem valor de auditoria próprio, o `AuditLog` da conta já registra o
 * evento (ver delete-accounts-payable-attachment.use-case.ts).
 */
export interface AccountsPayableAttachmentRepository {
  create(
    data: CreateAccountsPayableAttachmentInput,
  ): Promise<AccountsPayableAttachment>;

  findById(id: string): Promise<AccountsPayableAttachment | null>;

  /** Ordenado por `createdAt` desc — mais recente primeiro. */
  listByAccountsPayableId(
    accountsPayableId: string,
  ): Promise<AccountsPayableAttachment[]>;

  delete(id: string): Promise<void>;
}
