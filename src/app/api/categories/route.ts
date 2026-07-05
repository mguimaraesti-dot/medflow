import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { listCategoriesSchema } from "@/features/categories/application/dtos/list-categories.dto";
import { listCategoriesUseCase } from "@/features/categories/application/list-categories.use-case";
import { createCategorySchema } from "@/features/categories/application/dtos/create-category.dto";
import { createCategoryUseCase } from "@/features/categories/application/create-category.use-case";
import { PrismaCategoryRepository } from "@/features/categories/infrastructure/prisma-category.repository";

const categoryRepository = new PrismaCategoryRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.CASH_FLOW_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar categorias sem organização vinculada");
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listCategoriesSchema.parse(searchParams);

    const result = await listCategoriesUseCase(input, user.organizationId, {
      categoryRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/categories" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError("cadastrar categoria sem organização vinculada");
    }

    const body = await request.json();
    const input = createCategorySchema.parse(body);

    const result = await createCategoryUseCase(input, user.organizationId, {
      categoryRepository,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/categories",
      useCase: "createCategoryUseCase",
    });
  }
}
