import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { updateCategorySchema } from "@/features/categories/application/dtos/update-category.dto";
import { updateCategoryUseCase } from "@/features/categories/application/update-category.use-case";
import { deleteCategoryUseCase } from "@/features/categories/application/delete-category.use-case";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const categoryRepository = new PrismaCategoryRepository();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("editar categoria sem organização vinculada");
    }
    const { id } = await params;

    const body = await request.json();
    const input = updateCategorySchema.parse(body);

    const result = await updateCategoryUseCase(id, input, user.organizationId, {
      categoryRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/categories/[id]",
      useCase: "updateCategoryUseCase",
    });
  }
}

/** Só permitida quando não existe nenhuma Conta a Pagar, Lançamento de Fluxo de Caixa nem Recorrência vinculados (checado no use case). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("excluir categoria sem organização vinculada");
    }
    const { id } = await params;

    await deleteCategoryUseCase(id, user.organizationId, {
      categoryRepository,
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/categories/[id]",
      useCase: "deleteCategoryUseCase",
    });
  }
}
