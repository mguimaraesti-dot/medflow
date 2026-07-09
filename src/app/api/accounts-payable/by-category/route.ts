import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getAccountsPayableByCategorySchema } from "@/features/accounts-payable/application/dtos/get-accounts-payable-by-category.dto";
import { toAccountsPayableByCategoryResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable-by-category.response-dto";
import { getAccountsPayableByCategoryUseCase } from "@/features/accounts-payable/application/get-accounts-payable-by-category.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const categoryRepository = new PrismaCategoryRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar despesas por categoria sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getAccountsPayableByCategorySchema.parse(searchParams);

    const items = await getAccountsPayableByCategoryUseCase(
      input,
      user.organizationId,
      { accountsPayableRepository, categoryRepository },
    );

    return NextResponse.json({
      data: toAccountsPayableByCategoryResponseDTO(items),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/by-category",
    });
  }
}
