import type { OrganizationSettings } from "./organization-settings.entity";

/** Só WhatsApp e horário de envio dos lembretes são editáveis por enquanto — timezone/horários de funcionamento continuam sem UI de edição. */
export interface UpdateOrganizationSettingsInput {
  whatsapp: string | null;
  reminderSendHour: number;
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
