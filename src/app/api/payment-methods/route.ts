import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { listPaymentMethodsUseCase } from "@/features/payment-methods/application/list-payment-methods.use-case";
import { PrismaPaymentMethodRepository } from "@/features/payment-methods/infrastructure/prisma-payment-method.repository";

const paymentMethodRepository = new PrismaPaymentMethodRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "listar formas de pagamento sem organização vinculada",
      );
    }

    const result = await listPaymentMethodsUseCase(user.organizationId, {
      paymentMethodRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/payment-methods" });
  }
}
