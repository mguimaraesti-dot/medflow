import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getExpensesByCategorySchema } from "@/features/cash-flow/application/dtos/get-expenses-by-category.dto";
import { toExpensesByCategoryResponseDTO } from "@/features/cash-flow/application/dtos/expenses-by-category.response-dto";
import { getExpensesByCategoryUseCase } from "@/features/cash-flow/application/get-expenses-by-category.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const categoryRepository = new PrismaCategoryRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar despesas por categoria sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getExpensesByCategorySchema.parse(searchParams);

    const items = await getExpensesByCategoryUseCase(
      input,
      user.organizationId,
      { cashFlowEntryRepository, categoryRepository },
    );

    return NextResponse.json({ data: toExpensesByCategoryResponseDTO(items) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow/expenses-by-category",
    });
  }
}
