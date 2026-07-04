import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { createSupplierSchema } from "@/features/suppliers/application/dtos/create-supplier.dto";
import { createSupplierUseCase } from "@/features/suppliers/application/create-supplier.use-case";
import { listSuppliersUseCase } from "@/features/suppliers/application/list-suppliers.use-case";
import { PrismaSupplierRepository } from "@/features/suppliers/infrastructure/prisma-supplier.repository";

const supplierRepository = new PrismaSupplierRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_READ);
    if (!user.organizationId) {
      throw new ForbiddenError("listar fornecedores sem organização vinculada");
    }

    const result = await listSuppliersUseCase(user.organizationId, {
      supplierRepository,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/suppliers" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_CREATE);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "cadastrar fornecedor sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = createSupplierSchema.parse(body);

    const result = await createSupplierUseCase(input, user.organizationId, {
      supplierRepository,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/suppliers",
      useCase: "createSupplierUseCase",
    });
  }
}
