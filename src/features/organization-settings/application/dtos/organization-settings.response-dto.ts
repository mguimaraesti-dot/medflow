import type { OrganizationSettings } from "../../domain/organization-settings.entity";

export type OrganizationSettingsResponseDTO = OrganizationSettings;

export function toOrganizationSettingsResponseDTO(
  settings: OrganizationSettings,
): OrganizationSettingsResponseDTO {
  return settings;
}
