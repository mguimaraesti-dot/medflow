import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { getAccountsPayableSummarySchema } from "@/features/accounts-payable/application/dtos/accounts-payable-summary.dto";
import { toAccountsPayableSummaryResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable-summary.response-dto";
import { getAccountsPayableSummaryUseCase } from "@/features/accounts-payable/application/get-accounts-payable-summary.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar resumo de contas a pagar sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = getAccountsPayableSummarySchema.parse(searchParams);

    const result = await getAccountsPayableSummaryUseCase(
      input,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json({
      data: toAccountsPayableSummaryResponseDTO(result),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/summary",
    });
  }
}
