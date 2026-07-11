import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { sendAccountsPayableWhatsAppReminderUseCase } from "@/features/accounts-payable/application/send-accounts-payable-whatsapp-reminder.use-case";
import {
  NotFoundError,
  PayableAlreadyProcessedError,
  WhatsAppNotConfiguredError,
  WhatsAppSendError,
} from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { SupplierRepository } from "@/features/suppliers/domain/supplier.repository";
import type { WhatsAppMessagingPort } from "@/features/accounts-payable/domain/whatsapp-messaging.port";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function buildPayable(overrides: Record<string, unknown> = {}) {
  return {
    id: "payable-1",
    organizationId: "org-1",
    publicToken: "token-1",
    supplierId: "supplier-1",
    status: "PENDING",
    amount: new Prisma.Decimal("150.00"),
    description: "Aluguel",
    dueDate: new Date("2026-07-20T00:00:00.000Z"),
    barcode: "12345",
    pixKey: "pix-key-1",
    ...overrides,
  };
}

function buildDeps(overrides: {
  payable?: Record<string, unknown> | null;
  whatsapp?: string | null;
  supplier?: Record<string, unknown> | null;
  sendPaymentReminder?: ReturnType<typeof vi.fn>;
}) {
  const payable =
    overrides.payable === undefined ? buildPayable() : overrides.payable;
  const accountsPayableRepository = {
    findById: vi.fn().mockResolvedValue(payable),
    touchReminderSent: vi.fn(),
  } as unknown as AccountsPayableRepository;

  const organizationSettingsRepository = {
    findByOrganization: vi
      .fn()
      .mockResolvedValue(
        overrides.whatsapp === undefined
          ? { whatsapp: "11999999999" }
          : { whatsapp: overrides.whatsapp },
      ),
  } as unknown as OrganizationSettingsRepository;

  const supplier =
    overrides.supplier === undefined
      ? { id: "supplier-1", name: "Fornecedor Teste" }
      : overrides.supplier;
  const supplierRepository = {
    findById: vi.fn().mockResolvedValue(supplier),
  } as unknown as SupplierRepository;

  const whatsAppMessaging = {
    sendPaymentReminder:
      overrides.sendPaymentReminder ??
      vi.fn().mockResolvedValue({ messageId: "msg-123" }),
  } as unknown as WhatsAppMessagingPort;

  return {
    accountsPayableRepository,
    organizationSettingsRepository,
    supplierRepository,
    whatsAppMessaging,
  };
}

describe("sendAccountsPayableWhatsAppReminderUseCase", () => {
  it("bloqueia quando a conta não existe ou é de outra organização", async () => {
    const deps = buildDeps({ payable: null });

    await expect(
      sendAccountsPayableWhatsAppReminderUseCase(
        "payable-1",
        "org-1",
        "user-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia quando a conta já foi paga ou cancelada", async () => {
    const deps = buildDeps({ payable: buildPayable({ status: "PAID" }) });

    await expect(
      sendAccountsPayableWhatsAppReminderUseCase(
        "payable-1",
        "org-1",
        "user-1",
        deps,
      ),
    ).rejects.toThrow(PayableAlreadyProcessedError);
  });

  it("bloqueia quando a organização não tem WhatsApp configurado", async () => {
    const deps = buildDeps({ whatsapp: null });

    await expect(
      sendAccountsPayableWhatsAppReminderUseCase(
        "payable-1",
        "org-1",
        "user-1",
        deps,
      ),
    ).rejects.toThrow(WhatsAppNotConfiguredError);
  });

  it("bloqueia quando o fornecedor não é encontrado", async () => {
    const deps = buildDeps({ supplier: null });

    await expect(
      sendAccountsPayableWhatsAppReminderUseCase(
        "payable-1",
        "org-1",
        "user-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("traduz falha no envio em WhatsAppSendError e nunca marca lastReminderSentAt", async () => {
    const deps = buildDeps({
      sendPaymentReminder: vi
        .fn()
        .mockRejectedValue(new Error("Z-API fora do ar")),
    });

    await expect(
      sendAccountsPayableWhatsAppReminderUseCase(
        "payable-1",
        "org-1",
        "user-1",
        deps,
      ),
    ).rejects.toThrow(WhatsAppSendError);
    expect(
      deps.accountsPayableRepository.touchReminderSent,
    ).not.toHaveBeenCalled();
  });

  it("caminho feliz: envia as 3 mensagens, marca lastReminderSentAt e grava auditoria", async () => {
    const deps = buildDeps({});

    await sendAccountsPayableWhatsAppReminderUseCase(
      "payable-1",
      "org-1",
      "user-1",
      deps,
    );

    expect(deps.whatsAppMessaging.sendPaymentReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        accountsPayableId: "payable-1",
        phone: "11999999999",
        supplierName: "Fornecedor Teste",
        barcode: "12345",
        pixKey: "pix-key-1",
      }),
    );
    expect(
      deps.accountsPayableRepository.touchReminderSent,
    ).toHaveBeenCalledWith("payable-1", expect.any(Date), "msg-123");
  });
});
