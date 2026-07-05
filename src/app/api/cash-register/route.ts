import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { openCashRegisterSchema } from "@/features/cash-register/application/dtos/open-cash-register.dto";
import { listCashRegisterDaysSchema } from "@/features/cash-register/application/dtos/list-cash-register-days.dto";
import { openCashRegisterUseCase } from "@/features/cash-register/application/open-cash-register.use-case";
import { listCashRegisterDaysUseCase } from "@/features/cash-register/application/list-cash-register-days.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();
const safeRepository = new PrismaSafeRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "listar histórico de caixa sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listCashRegisterDaysSchema.parse(searchParams);

    const result = await listCashRegisterDaysUseCase(
      input,
      user.organizationId,
      { cashRegisterDayRepository },
    );

    return NextResponse.json({
      data: {
        ...result,
        items: result.items.map((item) => toCashRegisterDayResponseDTO(item)),
      },
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/cash-register" });
  }
}

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
      { cashRegisterDayRepository, safeRepository },
    );

    return NextResponse.json(
      { data: toCashRegisterDayResponseDTO(result) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register",
      useCase: "openCashRegisterUseCase",
    });
  }
}
