import { prisma } from "@/core/database/prisma.client";
import { logger } from "@/core/logger/logger";
import type { OrganizationSettingsRepository } from "../domain/organization-settings.repository";
import type { OrganizationSettings } from "../domain/organization-settings.entity";
import type { UpdateOrganizationSettingsInput } from "./dtos/update-organization-settings.dto";

interface Deps {
  organizationSettingsRepository: OrganizationSettingsRepository;
}

export async function updateOrganizationSettingsUseCase(
  input: UpdateOrganizationSettingsInput,
  organizationId: string,
  updatedByUserId: string,
  deps: Deps,
): Promise<OrganizationSettings> {
  const settings = await deps.organizationSettingsRepository.update(
    organizationId,
    {
      whatsapp: input.whatsapp,
      accountsPayableReminderWhatsapp: input.accountsPayableReminderWhatsapp,
      reminderSendHour: input.reminderSendHour,
    },
  );

  await prisma.auditLog.create({
    data: {
      userId: updatedByUserId,
      entity: "OrganizationSettings",
      entityId: settings.id,
      action: "UPDATE",
      after: {
        whatsapp: settings.whatsapp,
        accountsPayableReminderWhatsapp:
          settings.accountsPayableReminderWhatsapp,
        reminderSendHour: settings.reminderSendHour,
      },
    },
  });

  logger.info("Configurações da organização atualizadas", {
    organizationId,
  });

  return settings;
}
