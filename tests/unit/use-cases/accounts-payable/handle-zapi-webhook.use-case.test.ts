import { describe, it, expect, vi, afterEach } from "vitest";
import { handleZapiWebhookUseCase } from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import type { WhatsAppMessagingPort } from "@/features/accounts-payable/domain/whatsapp-messaging.port";

vi.mock(
  "@/features/accounts-payable/application/pay-accounts-payable.use-case",
  () => ({
    payAccountsPayableUseCase: vi.fn(),
  }),
);

function buildPayable(overrides: Record<string, unknown> = {}) {
  return {
    id: "payable-1",
    organizationId: "org-1",
    status: "PENDING",
    lastReminderSentAt: new Date("2026-07-10T10:00:00.000Z"),
    ...overrides,
  };
}

function buildDeps(overrides: {
  byMessageId?: Record<string, unknown> | null;
  candidates?: Record<string, unknown>[];
  systemUser?: { id: string } | null;
}) {
  const accountsPayableRepository = {
    findByLastReminderMessageId: vi
      .fn()
      .mockResolvedValue(
        overrides.byMessageId === undefined ? null : overrides.byMessageId,
      ),
    listPendingForReminders: vi
      .fn()
      .mockResolvedValue(overrides.candidates ?? [buildPayable()]),
  } as unknown as AccountsPayableRepository;

  const systemUser =
    overrides.systemUser === undefined
      ? { id: "system-user-1" }
      : overrides.systemUser;
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(systemUser),
  } as unknown as UserRepository;

  const safeRepository = {} as unknown as SafeRepository;
  const whatsAppMessaging = {
    sendPaymentConfirmedMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as WhatsAppMessagingPort;

  return {
    accountsPayableRepository,
    safeRepository,
    userRepository,
    whatsAppMessaging,
  };
}

describe("handleZapiWebhookUseCase", () => {
  afterEach(() => {
    vi.mocked(payAccountsPayableUseCase).mockReset();
  });

  it("ignora textos que não são confirmação de pagamento", async () => {
    const deps = buildDeps({});

    await handleZapiWebhookUseCase(
      {
        phone: "11999999999",
        messageText: "oi tudo bem?",
        quotedMessageId: null,
      },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.accountsPayableRepository.findByLastReminderMessageId,
    ).not.toHaveBeenCalled();
  });

  it("casa pelo id da mensagem citada quando presente", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      byMessageId: buildPayable({ id: "payable-quoted" }),
    });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", messageText: "PAGO", quotedMessageId: "msg-123" },
      "org-1",
      deps,
    );

    expect(
      deps.accountsPayableRepository.findByLastReminderMessageId,
    ).toHaveBeenCalledWith("msg-123");
    expect(payAccountsPayableUseCase).toHaveBeenCalledWith(
      "payable-quoted",
      "system-user-1",
      "org-1",
      {
        accountsPayableRepository: deps.accountsPayableRepository,
        safeRepository: deps.safeRepository,
      },
      "WHATSAPP",
    );
  });

  it("sem citação e com exatamente 1 candidata: confirma a única pendente com lembrete já enviado", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      candidates: [buildPayable({ id: "payable-unico" })],
    });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", messageText: "paguei!", quotedMessageId: null },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).toHaveBeenCalledWith(
      "payable-unico",
      "system-user-1",
      "org-1",
      expect.anything(),
      "WHATSAPP",
    );
  });

  it("sem citação e com 2+ candidatas: não adivinha, ignora e não confirma nada", async () => {
    const deps = buildDeps({
      candidates: [
        buildPayable({ id: "payable-a" }),
        buildPayable({ id: "payable-b" }),
      ],
    });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", messageText: "PAGO", quotedMessageId: null },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("sem citação e sem nenhuma candidata (nenhuma recebeu lembrete ainda): ignora", async () => {
    const deps = buildDeps({ candidates: [] });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", messageText: "PAGO", quotedMessageId: null },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("idempotente: não faz nada quando a conta encontrada já não está PENDENTE", async () => {
    const deps = buildDeps({
      byMessageId: buildPayable({ status: "PAID" }),
    });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", messageText: "PAGO", quotedMessageId: "msg-123" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("caminho feliz: confirma e manda mensagem de agradecimento de volta", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({ byMessageId: buildPayable() });

    await handleZapiWebhookUseCase(
      { phone: "11988887777", messageText: "PAGO", quotedMessageId: "msg-1" },
      "org-1",
      deps,
    );

    expect(
      deps.whatsAppMessaging.sendPaymentConfirmedMessage,
    ).toHaveBeenCalledWith("11988887777");
  });

  it("caminho feliz: mesmo se a mensagem de agradecimento falhar, o pagamento já foi confirmado (best-effort)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({ byMessageId: buildPayable() });
    vi.mocked(
      deps.whatsAppMessaging.sendPaymentConfirmedMessage,
    ).mockRejectedValue(new Error("Z-API fora do ar"));

    await expect(
      handleZapiWebhookUseCase(
        { phone: "11988887777", messageText: "PAGO", quotedMessageId: "msg-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();
    expect(payAccountsPayableUseCase).toHaveBeenCalled();
  });

  it("lança NotFoundError quando o usuário de sistema do WhatsApp não existe", async () => {
    const { NotFoundError } = await import("@/core/errors/domain-error");
    const deps = buildDeps({
      byMessageId: buildPayable(),
      systemUser: null,
    });

    await expect(
      handleZapiWebhookUseCase(
        { phone: "11999999999", messageText: "PAGO", quotedMessageId: "msg-1" },
        "org-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });
});
