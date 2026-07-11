import { NotFoundError } from "@/core/errors/domain-error";
import type { OrganizationSettingsRepository } from "../domain/organization-settings.repository";
import type { OrganizationSettings } from "../domain/organization-settings.entity";

interface Deps {
  organizationSettingsRepository: OrganizationSettingsRepository;
}

export async function getOrganizationSettingsUseCase(
  organizationId: string,
  deps: Deps,
): Promise<OrganizationSettings> {
  const settings =
    await deps.organizationSettingsRepository.findByOrganization(
      organizationId,
    );
  if (!settings) {
    throw new NotFoundError("Configurações da organização", organizationId);
  }
  return settings;
}
