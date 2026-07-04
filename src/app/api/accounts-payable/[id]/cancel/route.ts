import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import { cancelAccountsPayableUseCase } from "@/features/accounts-payable/application/cancel-accounts-payable.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_PAY);
    if (!user.organizationId) {
      throw new ForbiddenError("cancelar conta sem organização vinculada");
    }
    const { id } = await params;

    const result = await cancelAccountsPayableUseCase(
      id,
      user.id,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json({ data: toAccountsPayableResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/cancel",
      useCase: "cancelAccountsPayableUseCase",
    });
  }
}
