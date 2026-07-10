import type { OrganizationSettings } from "./organization-settings.entity";

/** Só o WhatsApp é editável por enquanto — timezone/horários de funcionamento continuam sem UI de edição. */
export interface UpdateOrganizationSettingsInput {
  whatsapp: string | null;
}

export interface OrganizationSettingsRepository {
  findByOrganization(
    organizationId: string,
  ): Promise<OrganizationSettings | null>;

  update(
    organizationId: string,
    data: UpdateOrganizationSettingsInput,
  ): Promise<OrganizationSettings>;
}
