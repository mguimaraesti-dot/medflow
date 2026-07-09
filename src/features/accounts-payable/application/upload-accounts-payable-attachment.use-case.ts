import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import {
  AttachmentStorageError,
  AttachmentTooLargeError,
  NotFoundError,
  UnsupportedAttachmentTypeError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "../domain/accounts-payable.repository";
import type { AccountsPayableAttachmentRepository } from "../domain/accounts-payable-attachment.repository";
import type { AttachmentStoragePort } from "../domain/attachment-storage.port";
import type { AccountsPayableAttachment } from "../domain/accounts-payable-attachment.entity";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENT_SIZE_MB,
  type UploadAccountsPayableAttachmentInput,
} from "./dtos/upload-accounts-payable-attachment.dto";

interface Deps {
  accountsPayableRepository: AccountsPayableRepository;
  attachmentRepository: AccountsPayableAttachmentRepository;
  attachmentStorage: AttachmentStoragePort;
}

/**
 * Confere que a conta existe e pertence à organização do usuário antes
 * de enviar qualquer coisa ao Drive (evita gastar uma chamada externa
 * numa conta que nem existe). Sem restrição de status — uma conta paga
 * também pode ganhar um comprovante depois.
 */
export async function uploadAccountsPayableAttachmentUseCase(
  accountsPayableId: string,
  input: UploadAccountsPayableAttachmentInput,
  uploadedByUserId: string,
  organizationId: string,
  deps: Deps,
): Promise<AccountsPayableAttachment> {
  const payable =
    await deps.accountsPayableRepository.findById(accountsPayableId);
  if (!payable || payable.organizationId !== organizationId) {
    throw new NotFoundError("Conta a pagar", accountsPayableId);
  }

  if (
    !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
      input.mimeType as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
    )
  ) {
    throw new UnsupportedAttachmentTypeError(input.mimeType);
  }
  if (input.buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new AttachmentTooLargeError(MAX_ATTACHMENT_SIZE_MB);
  }

  let uploaded;
  try {
    uploaded = await deps.attachmentStorage.upload({
      accountsPayableId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });
  } catch (error) {
    // Nunca loga o erro cru do Google (pode conter detalhe de credencial)
    // — só a mensagem, sem stack, sem o objeto inteiro.
    logger.error("Falha ao enviar anexo pro Google Drive", {
      organizationId,
      entity: "AccountsPayableAttachment",
      entityId: accountsPayableId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw new AttachmentStorageError("enviar");
  }

  const attachment = await deps.attachmentRepository.create({
    organizationId,
    accountsPayableId,
    driveFileId: uploaded.externalId,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: uploaded.sizeBytes,
    createdByUserId: uploadedByUserId,
  });

  await prisma.auditLog.create({
    data: {
      userId: uploadedByUserId,
      entity: "AccountsPayable",
      entityId: accountsPayableId,
      action: "UPDATE",
      reason: "Anexo adicionado.",
      after: { fileName: input.fileName, attachmentId: attachment.id },
    },
  });

  logger.info("Anexo de conta a pagar enviado", {
    organizationId,
    entity: "AccountsPayableAttachment",
    entityId: attachment.id,
    accountsPayableId,
  });

  return attachment;
}
