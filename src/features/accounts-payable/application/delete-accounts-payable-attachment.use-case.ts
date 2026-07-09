import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  AttachmentStorageError,
  NotFoundError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "../domain/accounts-payable-attachment.repository";
import type { AttachmentStoragePort } from "../domain/attachment-storage.port";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  attachmentRepository: AccountsPayableAttachmentRepository;
  attachmentStorage: AttachmentStoragePort;
}

/**
 * Apaga o arquivo no Drive antes do registro no banco — se o Drive
 * falhar por um motivo real (não "já não existe", isso o storage port
 * já engole), o registro continua no banco pra não perder o vínculo com
 * um arquivo que ainda pode estar lá; o usuário tenta de novo.
 */
export async function deleteAccountsPayableAttachmentUseCase(
  accountsPayableId: string,
  attachmentId: string,
  deletedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<void> {
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
    await deps.attachmentStorage.delete(attachment.driveFileId);
  } catch (error) {
    logger.error("Falha ao excluir anexo no Google Drive", {
      organizationId,
      entity: "AccountsPayableAttachment",
      entityId: attachmentId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AttachmentStorageError("excluir");
  }

  await deps.attachmentRepository.delete(attachmentId);

  await prisma.auditLog.create({
    data: {
      userId: deletedByUserId,
      entity: "AccountsPayable",
      entityId: accountsPayableId,
      action: "UPDATE",
      reason: "Anexo removido.",
      before: { fileName: attachment.fileName, attachmentId: attachment.id },
    },
  });

  logger.info("Anexo de conta a pagar excluído", {
    organizationId,
    entity: "AccountsPayableAttachment",
    entityId: attachmentId,
    accountsPayableId,
  });
}
