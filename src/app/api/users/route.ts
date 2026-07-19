import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { createSupabaseAdminClient } from "@/core/auth/supabase-admin.client";
import { createUserSchema } from "@/features/users/application/dtos/create-user.dto";
import { listUsersSchema } from "@/features/users/application/dtos/list-users.dto";
import { toUserResponseDTO } from "@/features/users/application/dtos/user.response-dto";
import { createUserUseCase } from "@/features/users/application/create-user.use-case";
import { listUsersUseCase } from "@/features/users/application/list-users.use-case";
import { PrismaUserManagementRepository } from "@/features/users/infrastructure/prisma-user-management.repository";

const userManagementRepository = new PrismaUserManagementRepository();

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
    if (!user.organizationId) {
      throw new ForbiddenError("listar usuários sem organização vinculada");
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const input = listUsersSchema.parse(searchParams);

    const result = await listUsersUseCase(input, user.organizationId, {
      userManagementRepository,
    });

    return NextResponse.json({
      data: { ...result, items: result.items.map(toUserResponseDTO) },
    });
  } catch (error) {
    return handleApiError(error, { requestId, route: "/api/users" });
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.USERS_MANAGE);
    if (!user.organizationId) {
      throw new ForbiddenError("cadastrar usuário sem organização vinculada");
    }

    const body = await request.json();
    const input = createUserSchema.parse(body);

    const { origin } = new URL(request.url);
    const result = await createUserUseCase(
      input,
      user.id,
      user.organizationId,
      {
        userManagementRepository,
        supabaseAdmin: createSupabaseAdminClient(),
        appOrigin: origin,
      },
    );

    return NextResponse.json(
      { data: toUserResponseDTO(result) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/users",
      useCase: "createUserUseCase",
    });
  }
}
