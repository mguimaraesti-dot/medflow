import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import {
  ForbiddenError,
  NoAttachmentFileError,
} from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toAccountsPayableAttachmentResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable-attachment.response-dto";
import { uploadAccountsPayableAttachmentUseCase } from "@/features/accounts-payable/application/upload-accounts-payable-attachment.use-case";
import { listAccountsPayableAttachmentsUseCase } from "@/features/accounts-payable/application/list-accounts-payable-attachments.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaAccountsPayableAttachmentRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable-attachment.repository";
import { GoogleDriveAttachmentStorage } from "@/features/accounts-payable/infrastructure/google-drive-attachment-storage";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const attachmentRepository = new PrismaAccountsPayableAttachmentRepository();
const attachmentStorage = new GoogleDriveAttachmentStorage();

/**
 * Upload de um ou mais anexos (`multipart/form-data`, campo repetido
 * `files`) — reaproveita PAYABLE_CREATE, mesma permissão já usada pra
 * editar a conta (o projeto não tem uma permissão dedicada de "editar").
 * Tipo/tamanho são validados dentro do use case (erro de domínio, não Zod
 * — o corpo não é JSON).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("enviar anexo sem organização vinculada");
    }
    const { id } = await params;

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      throw new NoAttachmentFileError();
    }

    const created = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const attachment = await uploadAccountsPayableAttachmentUseCase(
        id,
        { fileName: file.name, mimeType: file.type, buffer },
        user.id,
        user.organizationId,
        {
          accountsPayableRepository,
          attachmentRepository,
          attachmentStorage,
        },
      );
      created.push(toAccountsPayableAttachmentResponseDTO(attachment));
    }

    return NextResponse.json({ data: created });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/attachments",
      useCase: "uploadAccountsPayableAttachmentUseCase",
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar anexos sem organização vinculada");
    }
    const { id } = await params;

    const attachments = await listAccountsPayableAttachmentsUseCase(
      id,
      user.organizationId,
      { accountsPayableRepository, attachmentRepository },
    );

    return NextResponse.json({
      data: attachments.map(toAccountsPayableAttachmentResponseDTO),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/attachments",
      useCase: "listAccountsPayableAttachmentsUseCase",
    });
  }
}
