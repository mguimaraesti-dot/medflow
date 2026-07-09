/**
 * Anexo de uma Conta a Pagar — o arquivo físico vive no Google Drive
 * (`driveFileId`); aqui só o metadado. TypeScript puro, sem `Prisma.Decimal`
 * (nenhum campo monetário) nem qualquer import de infraestrutura.
 */
export interface AccountsPayableAttachment {
  id: string;
  organizationId: string;
  accountsPayableId: string;
  driveFileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  /** Denormalizado só pra exibição — via join na infraestrutura. */
  createdByUserName: string;
  createdAt: Date;
}
