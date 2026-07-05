import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toSafeResponseDTO } from "@/features/treasury/application/dtos/safe.response-dto";
import { getSafeSummaryUseCase } from "@/features/treasury/application/get-safe-summary.use-case";
import { PrismaSafeRepository } from "@/features/treasury/infrastructure/prisma-safe.repository";

const safeRepository = new PrismaSafeRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_REGISTER_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar saldo do Cofre sem organização vinculada",
      );
    }

    const balance = await getSafeSummaryUseCase(user.organizationId, {
      safeRepository,
    });

    return NextResponse.json({
      data: toSafeResponseDTO(user.organizationId, balance),
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/treasury/safe" });
  }
}
