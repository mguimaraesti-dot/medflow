import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { payAccountsPayableSchema } from "@/features/accounts-payable/application/dtos/pay-accounts-payable.dto";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_PAY);
    if (!user.organizationId) {
      throw new ForbiddenError("pagar conta sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json();
    const input = payAccountsPayableSchema.parse(body);

    const result = await payAccountsPayableUseCase(
      id,
      input,
      user.id,
      user.organizationId,
      { accountsPayableRepository, cashRegisterDayRepository },
    );

    return NextResponse.json({ data: toAccountsPayableResponseDTO(result) });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/pay",
      useCase: "payAccountsPayableUseCase",
    });
  }
}
