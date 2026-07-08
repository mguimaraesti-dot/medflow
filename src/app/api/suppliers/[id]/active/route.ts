import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { setSupplierActiveUseCase } from "@/features/suppliers/application/set-supplier-active.use-case";
import { PrismaSupplierRepository } from "@/features/suppliers/infrastructure/prisma-supplier.repository";

const supplierRepository = new PrismaSupplierRepository();

const setActiveSchema = z.object({ active: z.boolean() });

/** Inativar (`active: false`) ou reativar (`active: true`) — nunca afeta histórico, é só um flag de exibição/uso em cadastros novos. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "alterar status do beneficiário sem organização vinculada",
      );
    }
    const { id } = await params;

    const body = await request.json();
    const { active } = setActiveSchema.parse(body);

    const result = await setSupplierActiveUseCase(
      id,
      active,
      user.organizationId,
      { supplierRepository },
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/suppliers/[id]/active",
      useCase: "setSupplierActiveUseCase",
    });
  }
}
