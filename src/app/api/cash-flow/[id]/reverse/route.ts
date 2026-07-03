import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { generateRequestId } from "@/core/utils/request-id";
import { reverseCashFlowEntrySchema } from "@/features/cash-flow/application/dtos/reverse-cash-flow-entry.dto";
import { reverseCashFlowEntryUseCase } from "@/features/cash-flow/application/reverse-cash-flow-entry.use-case";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_REVERSE);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const input = reverseCashFlowEntrySchema.parse(body);

    const result = await reverseCashFlowEntryUseCase(id, input, user.id, {
      cashFlowEntryRepository,
      cashRegisterDayRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow/[id]/reverse",
      useCase: "reverseCashFlowEntryUseCase",
    });
  }
}
