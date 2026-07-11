import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { updateOrganizationSettingsSchema } from "@/features/organization-settings/application/dtos/update-organization-settings.dto";
import { toOrganizationSettingsResponseDTO } from "@/features/organization-settings/application/dtos/organization-settings.response-dto";
import { getOrganizationSettingsUseCase } from "@/features/organization-settings/application/get-organization-settings.use-case";
import { updateOrganizationSettingsUseCase } from "@/features/organization-settings/application/update-organization-settings.use-case";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";

const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();

export async function GET() {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(
      PERMISSIONS.ORGANIZATION_SETTINGS_MANAGE,
    );
    if (!user.organizationId) {
      throw new ForbiddenError(
        "ver configurações da organização sem organização vinculada",
      );
    }

    const result = await getOrganizationSettingsUseCase(user.organizationId, {
      organizationSettingsRepository,
    });

    return NextResponse.json({
      data: toOrganizationSettingsResponseDTO(result),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/organization-settings",
      useCase: "getOrganizationSettingsUseCase",
    });
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(
      PERMISSIONS.ORGANIZATION_SETTINGS_MANAGE,
    );
    if (!user.organizationId) {
      throw new ForbiddenError(
        "editar configurações da organização sem organização vinculada",
      );
    }

    const body = await request.json();
    const input = updateOrganizationSettingsSchema.parse(body);

    const result = await updateOrganizationSettingsUseCase(
      input,
      user.organizationId,
      user.id,
      { organizationSettingsRepository },
    );

    return NextResponse.json({
      data: toOrganizationSettingsResponseDTO(result),
    });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/organization-settings",
      useCase: "updateOrganizationSettingsUseCase",
    });
  }
}
