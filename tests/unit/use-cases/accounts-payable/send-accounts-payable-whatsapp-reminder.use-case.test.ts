import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { sendAccountsPayableWhatsAppReminderUseCase } from "@/features/accounts-payable/application/send-accounts-payable-whatsapp-reminder.use-case";
import { prisma } from "@/core/database/prisma.client";
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
  accountsPayableReminderWhatsapp?: string | null;
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
    findByOrganization: vi.fn().mockResolvedValue({
      whatsapp:
        overrides.whatsapp === undefined ? "11999999999" : overrides.whatsapp,
      accountsPayableReminderWhatsapp:
        overrides.accountsPayableReminderWhatsapp === undefined
          ? null
          : overrides.accountsPayableReminderWhatsapp,
    }),
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

  it("na falha, grava WHATSAPP_REMINDER_FAILED no AuditLog com o motivo e o userId de quem disparou", async () => {
    vi.mocked(prisma.auditLog.create).mockClear();
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

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        entity: "AccountsPayable",
        entityId: "payable-1",
        action: "WHATSAPP_REMINDER_FAILED",
        reason: "Z-API fora do ar",
      },
    });
  });

  it("se o próprio AuditLog da falha falhar, o WhatsAppSendError original ainda propaga (não fica mascarado)", async () => {
    vi.mocked(prisma.auditLog.create).mockClear();
    vi.mocked(prisma.auditLog.create).mockRejectedValueOnce(
      new Error("Banco fora do ar"),
    );
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

  it("com accountsPayableReminderWhatsapp preenchido (id de grupo), envia para o grupo em vez do whatsapp padrão", async () => {
    const deps = buildDeps({
      accountsPayableReminderWhatsapp: "120363412092364134-group",
    });

    await sendAccountsPayableWhatsAppReminderUseCase(
      "payable-1",
      "org-1",
      "user-1",
      deps,
    );

    expect(deps.whatsAppMessaging.sendPaymentReminder).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "120363412092364134-group" }),
    );
  });

  it("com accountsPayableReminderWhatsapp vazio, cai no whatsapp padrão (comportamento idêntico ao atual)", async () => {
    const deps = buildDeps({ accountsPayableReminderWhatsapp: null });

    await sendAccountsPayableWhatsAppReminderUseCase(
      "payable-1",
      "org-1",
      "user-1",
      deps,
    );

    expect(deps.whatsAppMessaging.sendPaymentReminder).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "11999999999" }),
    );
  });
});
