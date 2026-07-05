import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { createAccountsPayableSchema } from "@/features/accounts-payable/application/dtos/create-accounts-payable.dto";
import { listAccountsPayableSchema } from "@/features/accounts-payable/application/dtos/list-accounts-payable.dto";
import { toAccountsPayableResponseDTO } from "@/features/accounts-payable/application/dtos/accounts-payable.response-dto";
import { createAccountsPayableUseCase } from "@/features/accounts-payable/application/create-accounts-payable.use-case";
import { createRecurringAccountsPayableUseCase } from "@/features/accounts-payable/application/create-recurring-accounts-payable.use-case";
import { listAccountsPayableUseCase } from "@/features/accounts-payable/application/list-accounts-payable.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const recurringBillRepository = new PrismaRecurringBillRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "listar contas a pagar sem organização vinculada",
      );
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listAccountsPayableSchema.parse(searchParams);

    const result = await listAccountsPayableUseCase(
      input,
      user.organizationId,
      {
        accountsPayableRepository,
      },
    );

    return NextResponse.json({
      data: {
        ...result,
        items: result.items.map((item) => toAccountsPayableResponseDTO(item)),
      },
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/accounts-payable" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "cadastrar conta a pagar sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = createAccountsPayableSchema.parse(body);

    if (input.recurrence) {
      const { recurrence, ...rest } = input;
      const result = await createRecurringAccountsPayableUseCase(
        { ...rest, firstDueDate: input.dueDate, ...recurrence },
        user.id,
        user.organizationId,
        { accountsPayableRepository, recurringBillRepository },
      );

      return NextResponse.json(
        { data: toAccountsPayableResponseDTO(result.payables[0]) },
        { status: 201 },
      );
    }

    const result = await createAccountsPayableUseCase(
      input,
      user.id,
      user.organizationId,
      { accountsPayableRepository },
    );

    return NextResponse.json(
      { data: toAccountsPayableResponseDTO(result) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable",
      useCase: "createAccountsPayableUseCase",
    });
  }
}
