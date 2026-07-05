import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import { restoreAccountsPayableUseCase } from "@/features/accounts-payable/application/restore-accounts-payable.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();

/** Restaura uma conta excluída (soft delete) — exclusivo de Administrador. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_DELETE);
    if (!user.organizationId) {
      throw new ForbiddenError("restaurar conta sem organização vinculada");
    }
    const { id } = await params;

    const result = await restoreAccountsPayableUseCase(
      id,
      user.id,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json({ data: toAccountsPayableResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/restore",
      useCase: "restoreAccountsPayableUseCase",
    });
  }
}
