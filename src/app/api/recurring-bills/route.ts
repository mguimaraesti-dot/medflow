import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { toRecurringBillResponseDTO } from "@/features/recurring-bills/application/dtos/recurring-bill.response-dto";
import { listRecurringBillsUseCase } from "@/features/recurring-bills/application/list-recurring-bills.use-case";
import { PrismaRecurringBillRepository } from "@/features/recurring-bills/infrastructure/prisma-recurring-bill.repository";

const recurringBillRepository = new PrismaRecurringBillRepository();

/**
 * Só leitura — a criação de recorrência acontece exclusivamente pelo
 * checkbox "Conta recorrente" em Nova Conta (POST /api/accounts-payable),
 * que gera a regra e já bate as ocorrências reais junto. O formulário
 * antigo deste endpoint (regra "capada" — só mensal, sem prazo) foi
 * removido (Refinamento "Programações").
 */
export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar recorrências sem organização vinculada");
    }

    const result = await listRecurringBillsUseCase(user.organizationId, {
      recurringBillRepository,
    });

    return NextResponse.json({ data: result.map(toRecurringBillResponseDTO) });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/recurring-bills" });
  }
}
