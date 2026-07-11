import { prisma } from "@/core/database/prisma.client";
import type {
  OrganizationSettingsRepository,
  UpdateOrganizationSettingsInput,
} from "../domain/organization-settings.repository";
import type { OrganizationSettings } from "../domain/organization-settings.entity";

export class PrismaOrganizationSettingsRepository implements OrganizationSettingsRepository {
  async findByOrganization(
    organizationId: string,
  ): Promise<OrganizationSettings | null> {
    return prisma.organizationSettings.findUnique({
      where: { organizationId },
    });
  }

  async update(
    organizationId: string,
    data: UpdateOrganizationSettingsInput,
  ): Promise<OrganizationSettings> {
    return prisma.organizationSettings.update({
      where: { organizationId },
      data: { whatsapp: data.whatsapp },
    });
  }
}
