import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { openCashRegisterSchema } from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { openCashRegisterUseCase } from "@/features/cash-register/application/open-cash-register.use-case";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_OPEN);
    if (!user.organizationId) {
      throw new ForbiddenError("abrir caixa sem organização vinculada");
    }

    const body = await request.json().catch(() => ({}));
    const input = openCashRegisterSchema.parse(body);

    const result = await openCashRegisterUseCase(
      input,
      user.id,
      user.organizationId,
      { cashRegisterDayRepository },
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register",
      useCase: "openCashRegisterUseCase",
    });
  }
}
