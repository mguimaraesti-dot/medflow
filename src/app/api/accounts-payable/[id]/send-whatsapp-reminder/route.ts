import { NextResponse } from "next/server";
import { requirePermission } from "@/core/permissions/rbac.middleware";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { handleApiError } from "@/core/errors/error-handler";
import { ForbiddenError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { sendAccountsPayableWhatsAppReminderUseCase } from "@/features/accounts-payable/application/send-accounts-payable-whatsapp-reminder.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";
import { PrismaSupplierRepository } from "@/features/suppliers/infrastructure/prisma-supplier.repository";
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();
const supplierRepository = new PrismaSupplierRepository();
const whatsAppMessaging = new ZapiWhatsAppMessaging();

/** Botão "Enviar WhatsApp agora" no cadastro da conta — dispara o lembrete na hora, independente da janela de antecedência do cron. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = generateRequestId();

  try {
    const user = await requirePermission(PERMISSIONS.PAYABLE_PAY);
    if (!user.organizationId) {
      throw new ForbiddenError(
        "enviar lembrete de WhatsApp sem organização vinculada",
      );
    }
    const { id } = await params;

    await sendAccountsPayableWhatsAppReminderUseCase(
      id,
      user.organizationId,
      user.id,
      {
        accountsPayableRepository,
        organizationSettingsRepository,
        supplierRepository,
        whatsAppMessaging,
      },
    );

    return NextResponse.json({ data: { id } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/accounts-payable/[id]/send-whatsapp-reminder",
      useCase: "sendAccountsPayableWhatsAppReminderUseCase",
    });
  }
}
