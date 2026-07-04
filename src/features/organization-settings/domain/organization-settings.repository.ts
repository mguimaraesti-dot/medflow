import type { OrganizationSettings } from "./organization-settings.entity";

export interface OrganizationSettingsRepository {
  findByOrganization(
    organizationId: string,
  ): Promise<OrganizationSettings | null>;
}
