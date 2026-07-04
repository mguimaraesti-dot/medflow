import { prisma } from "@/core/database/prisma.client";
import type { OrganizationSettingsRepository } from "../domain/organization-settings.repository";
import type { OrganizationSettings } from "../domain/organization-settings.entity";

export class PrismaOrganizationSettingsRepository implements OrganizationSettingsRepository {
  async findByOrganization(
    organizationId: string,
  ): Promise<OrganizationSettings | null> {
    return prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
  }
}
