import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toRecurringBillInsightsResponseDTO } from "@/features/recurring-bills/application/dtos/recurring-bill-insights.response-dto";
import { getRecurringBillInsightsUseCase } from "@/features/recurring-bills/application/get-recurring-bill-insights.use-case";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const recurringBillRepository = new PrismaRecurringBillRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();

/** Detalhe + resumo financeiro + saúde + insight automático de uma recorrência — usado pelo Card de Recorrência e pelo Drawer "Linha do Tempo". */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar insights de recorrência sem organização vinculada",
      );
    }
    const { id } = await params;

    const result = await getRecurringBillInsightsUseCase(
      id,
      user.organizationId,
      { recurringBillRepository, accountsPayableRepository },
    );

    return NextResponse.json({
      data: toRecurringBillInsightsResponseDTO(result),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/recurring-bills/[id]/insights",
      useCase: "getRecurringBillInsightsUseCase",
    });
  }
}
