import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { rejectConferenceSchema } from "@/features/cash-register/application/dtos/reject-conference.dto";
import { rejectConferenceUseCase } from "@/features/cash-register/application/reject-conference.use-case";
import { toCashRegisterDayResponseDTO } from "@/features/cash-register/application/dtos/cash-register-day.response-dto";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(
      PERMISSIONS.TREASURY_REJECT_CONFERENCE,
    );
    if (!user.organizationId) {
      throw new ForbiddenError(
        "rejeitar conferência sem organização vinculada",
      );
    }

    const body = await request.json().catch(() => ({}));
    const input = rejectConferenceSchema.parse(body);

    const result = await rejectConferenceUseCase(
      input,
      user.id,
      user.organizationId,
      { cashRegisterDayRepository },
    );

    return NextResponse.json({ data: toCashRegisterDayResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-register/reject-conference",
      useCase: "rejectConferenceUseCase",
    });
  }
}
