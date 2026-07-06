import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { recurringBillsScheduleQuerySchema } from "@/features/recurring-bills/application/dtos/recurring-bills-schedule.dto";
import { toRecurringBillsScheduleResponseDTO } from "@/features/recurring-bills/application/dtos/recurring-bills-schedule.response-dto";
import { getRecurringBillsScheduleUseCase } from "@/features/recurring-bills/application/get-recurring-bills-schedule.use-case";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";

const recurringBillRepository = new PrismaRecurringBillRepository();
const accountsPayableRepository = new PrismaAccountsPayableRepository();

/** Programação financeira (mês/ano) das recorrências ativas — só ocorrências já geradas. */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "consultar programação de recorrências sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = recurringBillsScheduleQuerySchema.parse(searchParams);

    const result = await getRecurringBillsScheduleUseCase(
      input.month,
      input.year,
      user.organizationId,
      { recurringBillRepository, accountsPayableRepository },
    );

    return NextResponse.json({
      data: toRecurringBillsScheduleResponseDTO(result),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/recurring-bills/schedule",
      useCase: "getRecurringBillsScheduleUseCase",
    });
  }
}
