import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { createCashFlowEntrySchema } from "@/features/cash-flow/application/dtos/create-cash-flow-entry.dto";
import { listCashFlowEntriesSchema } from "@/features/cash-flow/application/dtos/list-cash-flow-entries.dto";
import { createCashFlowEntryUseCase } from "@/features/cash-flow/application/create-cash-flow-entry.use-case";
import { listCashFlowEntriesUseCase } from "@/features/cash-flow/application/list-cash-flow-entries.use-case";
import { toCashFlowEntryResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-entry.response-dto";
import { PrismaCashFlowEntryRepository } from "@/features/cash-flow/infrastructure/prisma-cash-flow-entry.repository";
import { PrismaCashRegisterDayRepository } from "@/features/cash-register/infrastructure/prisma-cash-register-day.repository";

const cashFlowEntryRepository = new PrismaCashFlowEntryRepository();
const cashRegisterDayRepository = new PrismaCashRegisterDayRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar lançamentos sem organização vinculada");
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listCashFlowEntriesSchema.parse(searchParams);

    const result = await listCashFlowEntriesUseCase(
      input,
      user.organizationId,
      {
        cashFlowEntryRepository,
      },
    );

    return NextResponse.json({
      data: {
        ...result,
        items: result.items.map(toCashFlowEntryResponseDTO),
      },
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/cash-flow" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("lançar movimentação sem organização vinculada");
    }

    const body = await request.json();
    const input = createCashFlowEntrySchema.parse(body);

    const result = await createCashFlowEntryUseCase(
      input,
      user.id,
      user.organizationId,
      { cashFlowEntryRepository, cashRegisterDayRepository },
    );

    return NextResponse.json(
      { data: toCashFlowEntryResponseDTO(result) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cash-flow",
      useCase: "createCashFlowEntryUseCase",
    });
  }
}
