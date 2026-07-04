import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { createRecurringBillSchema } from "@/features/recurring-bills/application/dtos/create-recurring-bill.dto";
import { toRecurringBillResponseDTO } from "@/features/recurring-bills/application/dtos/recurring-bill.response-dto";
import { createRecurringBillUseCase } from "@/features/recurring-bills/application/create-recurring-bill.use-case";
import { listRecurringBillsUseCase } from "@/features/recurring-bills/application/list-recurring-bills.use-case";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";

const recurringBillRepository = new PrismaRecurringBillRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar recorrências sem organização vinculada");
    }

    const result = await listRecurringBillsUseCase(user.organizationId, {
      recurringBillRepository,
    });

    return NextResponse.json({ data: result.map(toRecurringBillResponseDTO) });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/recurring-bills" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "cadastrar recorrência sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = createRecurringBillSchema.parse(body);

    const result = await createRecurringBillUseCase(
      input,
      user.organizationId,
      {
        recurringBillRepository,
      },
    );

    return NextResponse.json(
      { data: toRecurringBillResponseDTO(result) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/recurring-bills",
      useCase: "createRecurringBillUseCase",
    });
  }
}
