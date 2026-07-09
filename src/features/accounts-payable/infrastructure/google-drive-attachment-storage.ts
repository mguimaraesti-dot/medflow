import {
  deleteFileFromDrive,
  downloadFileFromDrive,
  getGoogleDriveFolderId,
  uploadFileToDrive,
} from "@/core/google-drive/google-drive.client";
import type {
  AttachmentDownload,
  AttachmentStoragePort,
  UploadAttachmentInput,
  UploadedAttachment,
} from "../domain/attachment-storage.port";

/** Só caracteres perigosos pra nome de arquivo — mantém acentos/espaços (o Drive lida bem com eles). */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[/\\?%*:|"<>]/g, "-");
}

/**
 * Implementa `AttachmentStoragePort` sobre o Google Drive. Todos os
 * arquivos vivem numa única pasta (`GOOGLE_DRIVE_FOLDER_ID`) — a
 * "organização" pedida (`contas-a-pagar/{id}/{timestamp}-{nome}`) é só
 * o `name` do arquivo no Drive, não uma hierarquia real de pastas (o
 * Drive aceita "/" como caractere normal no nome).
 */
export class GoogleDriveAttachmentStorage implements AttachmentStoragePort {
  async upload(input: UploadAttachmentInput): Promise<UploadedAttachment> {
    const driveName = `contas-a-pagar/${input.accountsPayableId}/${Date.now()}-${sanitizeFileName(input.fileName)}`;

    const result = await uploadFileToDrive({
      name: driveName,
      mimeType: input.mimeType,
      buffer: input.buffer,
      parentFolderId: getGoogleDriveFolderId(),
    });

    return { externalId: result.fileId, sizeBytes: result.sizeBytes };
  }

  async delete(externalId: string): Promise<void> {
    await deleteFileFromDrive(externalId);
  }

  async download(externalId: string): Promise<AttachmentDownload> {
    const { stream, mimeType } = await downloadFileFromDrive(externalId);
    return { stream, mimeType };
  }
}
