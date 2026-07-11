import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma.client";
import { handleApiError } from "@/core/errors/error-handler";
import { UnauthenticatedError } from "@/core/errors/domain-error";
import { generateRequestId } from "@/core/utils/request-id";
import { runAccountsPayableRemindersUseCase } from "@/features/accounts-payable/application/run-accounts-payable-reminders.use-case";
import { PrismaAccountsPayableRepository } from "@/features/accounts-payable/infrastructure/prisma-accounts-payable.repository";
import { PrismaOrganizationSettingsRepository } from "@/features/organization-settings/infrastructure/prisma-organization-settings.repository";
import { PrismaSupplierRepository } from "@/features/suppliers/infrastructure/prisma-supplier.repository";
import { ZapiWhatsAppMessaging } from "@/features/accounts-payable/infrastructure/zapi-whatsapp-messaging";

const accountsPayableRepository = new PrismaAccountsPayableRepository();
const organizationSettingsRepository =
  new PrismaOrganizationSettingsRepository();
const supplierRepository = new PrismaSupplierRepository();
const whatsAppMessaging = new ZapiWhatsAppMessaging();

// Processa cada conta pendente em sequência — até 5 mensagens por
// conta agora (cartão + rótulo/valor do boleto + rótulo/valor do Pix),
// ~4.8s de intervalos garantidos cada uma (ver
// zapi-whatsapp-messaging.ts). 60s já é o teto do plano Hobby da
// Vercel — dá pra um lote pequeno/médio, mas com esse aumento de 3
// para 5 mensagens por conta, o lote máximo antes de estourar o
// timeout ficou menor; se o volume de lembretes crescer, isso precisa
// virar processamento em lote/paralelo de verdade (ou plano Pro).
export const maxDuration = 60;

/**
 * Chamada 1x por dia pela Vercel Cron (`vercel.json`) — sem sessão,
 * autenticada pelo header `Authorization: Bearer $CRON_SECRET` que a
 * própria Vercel envia. Primeira rota do projeto sem `requirePermission`
 * (não há usuário logado num cron job).
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new UnauthenticatedError();
    }

    // MVP mono-organização (CLAUDE.md) — itera sobre todas mesmo assim,
    // pronto pra quando existir mais de uma.
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    const results = await Promise.all(
      organizations.map((organization) =>
        runAccountsPayableRemindersUseCase(organization.id, {
          accountsPayableRepository,
          organizationSettingsRepository,
          supplierRepository,
          whatsAppMessaging,
        }),
      ),
    );

    const summary = results.reduce(
      (total, result) => ({
        sentCount: total.sentCount + result.sentCount,
        failedCount: total.failedCount + result.failedCount,
      }),
      { sentCount: 0, failedCount: 0 },
    );

    return NextResponse.json({ data: summary });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/cron/accounts-payable-reminders",
      useCase: "runAccountsPayableRemindersUseCase",
    });
  }
}
