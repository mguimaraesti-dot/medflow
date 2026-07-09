/**
 * Abstrai onde o arquivo físico de um anexo é armazenado — hoje só o
 * Google Drive (`infrastructure/google-drive-attachment-storage.ts`),
 * mas os use cases nunca importam `googleapis` diretamente, só esta
 * porta. Troca de provedor de armazenamento no futuro vira só uma nova
 * implementação desta interface, sem tocar em domain/application.
 */
export interface UploadAttachmentInput {
  accountsPayableId: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface UploadedAttachment {
  /** Id do arquivo no provedor de armazenamento (hoje: Google Drive fileId). */
  externalId: string;
  sizeBytes: number;
}

export interface AttachmentDownload {
  stream: NodeJS.ReadableStream;
  mimeType: string;
}

export interface AttachmentStoragePort {
  upload(input: UploadAttachmentInput): Promise<UploadedAttachment>;

  /**
   * Best-effort: implementações devem engolir "arquivo não encontrado"
   * (já removido manualmente por fora do app) em vez de lançar — a
   * exclusão do registro no banco nunca pode travar por causa disso.
   */
  delete(externalId: string): Promise<void>;

  download(externalId: string): Promise<AttachmentDownload>;
}
