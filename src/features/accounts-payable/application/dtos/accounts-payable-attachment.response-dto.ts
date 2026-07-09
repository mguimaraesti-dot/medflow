import type { AccountsPayableAttachment } from "../../domain/accounts-payable-attachment.entity";

export interface AccountsPayableAttachmentResponseDTO {
  id: string;
  accountsPayableId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserName: string;
  createdAt: Date;
}

export function toAccountsPayableAttachmentResponseDTO(
  attachment: AccountsPayableAttachment,
): AccountsPayableAttachmentResponseDTO {
  return {
    id: attachment.id,
    accountsPayableId: attachment.accountsPayableId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdByUserName: attachment.createdByUserName,
    createdAt: attachment.createdAt,
  };
}
