import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { updateSupplierSchema } from "@/features/suppliers/application/dtos/update-supplier.dto";
import { updateSupplierUseCase } from "@/features/suppliers/application/update-supplier.use-case";
import { deleteSupplierUseCase } from "@/features/suppliers/application/delete-supplier.use-case";
import { PrismaSupplierRepository } from "@/features/suppliers/infrastructure/prisma-supplier.repository";

const supplierRepository = new PrismaSupplierRepository();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("editar beneficiário sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json();
    const input = updateSupplierSchema.parse(body);

    const result = await updateSupplierUseCase(id, input, user.organizationId, {
      supplierRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/suppliers/[id]",
      useCase: "updateSupplierUseCase",
    });
  }
}

/** Só permitida quando não existe nenhuma Conta a Pagar nem Recorrência vinculada (checado no use case). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "excluir beneficiário sem organização vinculada",
      );
    }
    const { id } = await params;

    await deleteSupplierUseCase(id, user.organizationId, {
      supplierRepository,
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/suppliers/[id]",
      useCase: "deleteSupplierUseCase",
    });
  }
}
