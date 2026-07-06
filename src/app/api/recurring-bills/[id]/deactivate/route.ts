import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toRecurringBillResponseDTO } from "@/features/recurring-bills/application/dtos/recurring-bill.response-dto";
import { deactivateRecurringBillUseCase } from "@/features/recurring-bills/application/deactivate-recurring-bill.use-case";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";

const recurringBillRepository = new PrismaRecurringBillRepository();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "encerrar recorrência sem organização vinculada",
      );
    }
    const { id } = await params;

    const result = await deactivateRecurringBillUseCase(
      id,
      user.organizationId,
      user.id,
      { recurringBillRepository },
    );

    return NextResponse.json({ data: toRecurringBillResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/recurring-bills/[id]/deactivate",
      useCase: "deactivateRecurringBillUseCase",
    });
  }
}
