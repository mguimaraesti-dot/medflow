/**
 * Sem schema zod aqui de propósito — o corpo chega como `multipart/form-data`
 * (não JSON), então a rota extrai `File`s do `FormData` diretamente e passa
 * pro use case; a validação de tipo/tamanho vira erro de domínio
 * (`UnsupportedAttachmentTypeError`/`AttachmentTooLargeError`), não Zod.
 */
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_ATTACHMENT_SIZE_MB = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

export interface UploadAccountsPayableAttachmentInput {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}
