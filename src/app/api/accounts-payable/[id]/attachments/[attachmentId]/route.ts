import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { downloadAccountsPayableAttachmentUseCase } from "@/features/accounts-payable/application/download-accounts-payable-attachment.use-case";
import { deleteAccountsPayableAttachmentUseCase } from "@/features/accounts-payable/application/delete-accounts-payable-attachment.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaAccountsPayableAttachmentRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable-attachment.repository";
import { GoogleDriveAttachmentStorage } from "@/features/accounts-payable/infrastructure/google-drive-attachment-storage";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const attachmentRepository = new PrismaAccountsPayableAttachmentRepository();
const attachmentStorage = new GoogleDriveAttachmentStorage();

/**
 * Transmite o arquivo pelo próprio backend (streaming) — nunca redireciona
 * pra uma URL do Drive nem torna o arquivo público. A permissão é
 * checada antes de qualquer chamada ao Drive.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("baixar anexo sem organização vinculada");
    }
    const { id, attachmentId } = await params;

    const { attachment, stream, mimeType } =
      await downloadAccountsPayableAttachmentUseCase(
        id,
        attachmentId,
        user.organizationId,
        {
          accountsPayableRepository,
          attachmentRepository,
          attachmentStorage,
        },
      );

    const webStream = Readable.toWeb(
      stream as Readable,
    ) as ReadableStream<Uint8Array>;

    // filename* (RFC 5987) cobre acentos; filename simples é só fallback
    // pra clientes antigos que não leem filename*.
    const asciiFallback = attachment.fileName.replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      },
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/attachments/[attachmentId]",
      useCase: "downloadAccountsPayableAttachmentUseCase",
    });
  }
}

/**
 * Reaproveita PAYABLE_CREATE (mesma permissão de editar a conta) — ver
 * comentário em `../route.ts` sobre não existir uma permissão dedicada
 * de "editar" neste projeto.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("excluir anexo sem organização vinculada");
    }
    const { id, attachmentId } = await params;

    await deleteAccountsPayableAttachmentUseCase(
      id,
      attachmentId,
      user.id,
      user.organizationId,
      { accountsPayableRepository, attachmentRepository, attachmentStorage },
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/attachments/[attachmentId]",
      useCase: "deleteAccountsPayableAttachmentUseCase",
    });
  }
}
