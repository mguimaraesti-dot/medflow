import { logger } from "@/core/logger/logger";
import {
  AttachmentStorageError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "../domain/accounts-payable-attachment.repository";
import type { AttachmentStoragePort } from "../domain/attachment-storage.port";
import type { AccountsPayableAttachment } from "../domain/accounts-payable-attachment.entity";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  attachmentRepository: AccountsPayableAttachmentRepository;
  attachmentStorage: AttachmentStoragePort;
}

export interface AccountsPayableAttachmentDownload {
  attachment: AccountsPayableAttachment;
  stream: NodeJS.ReadableStream;
  mimeType: string;
}

/**
 * Nunca expõe uma URL direta do Drive — o arquivo é transmitido pelo
 * próprio backend (streaming), depois de confirmar que o usuário tem
 * permissão de leitura na conta a pagar (checado antes disso, na rota,
 * via `requirePermission(PAYABLE_READ)`; aqui só confere que a conta e
 * o anexo pertencem à organização da sessão).
 */
export async function downloadAccountsPayableAttachmentUseCase(
  accountsPayableId: string,
  attachmentId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayableAttachmentDownload> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  const attachment = await deps.attachmentRepository.findById(attachmentId);
  if (!attachment || attachment.accountsPayableId !== accountsPayableId) {
    throw new NotFoundError("Anexo", attachmentId);
  }

  try {
    const { stream, mimeType } = await deps.attachmentStorage.download(
      attachment.driveFileId,
    );
    return { attachment, stream, mimeType };
  } catch (error) {
    logger.error("Falha ao baixar anexo do Google Drive", {
      organizationId,
      entity: "AccountsPayableAttachment",
      entityId: attachmentId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AttachmentStorageError("baixar");
  }
}
