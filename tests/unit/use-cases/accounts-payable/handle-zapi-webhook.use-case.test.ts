import { describe, it, expect, vi, afterEach } from "vitest";
import { handleZapiWebhookUseCase } from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { WhatsAppMessagingPort } from "@/features/accounts-payable/domain/whatsapp-messaging.port";
import { logger } from "@/core/logger/logger";

vi.mock(
  "@/features/accounts-payable/application/pay-accounts-payable.use-case",
  () => ({
    payAccountsPayableUseCase: vi.fn(),
  }),
);

vi.mock("@/core/logger/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

function buildPayable(overrides: Record<string, unknown> = {}) {
  return {
    id: "payable-1",
    organizationId: "org-1",
    status: "PENDING",
    lastReminderMessageId: "msg-999",
    ...overrides,
  };
}

function buildDeps(overrides: {
  payable?: Record<string, unknown> | null;
  systemUser?: { id: string } | null;
  settings?: {
    whatsapp: string | null;
    accountsPayableReminderWhatsapp: string | null;
  } | null;
}) {
  const payable =
    overrides.payable === undefined ? buildPayable() : overrides.payable;
  const accountsPayableRepository = {
    findById: vi.fn().mockResolvedValue(payable),
  } as unknown as AccountsPayableRepository;

  const systemUser =
    overrides.systemUser === undefined
      ? { id: "system-user-1" }
      : overrides.systemUser;
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(systemUser),
  } as unknown as UserRepository;

  const safeRepository = {} as unknown as SafeRepository;

  const settings =
    overrides.settings === undefined
      ? { whatsapp: "5511999999999", accountsPayableReminderWhatsapp: null }
      : overrides.settings;
  const organizationSettingsRepository = {
    findByOrganization: vi.fn().mockResolvedValue(settings),
  } as unknown as OrganizationSettingsRepository;

  const whatsAppMessaging = {
    sendPaymentReminder: vi.fn(),
    reactToPaymentConfirmed: vi.fn().mockResolvedValue(undefined),
    deleteButtonReply: vi.fn().mockResolvedValue(undefined),
  } as unknown as WhatsAppMessagingPort;

  return {
    accountsPayableRepository,
    safeRepository,
    userRepository,
    organizationSettingsRepository,
    whatsAppMessaging,
  };
}

describe("handleZapiWebhookUseCase", () => {
  afterEach(() => {
    vi.mocked(payAccountsPayableUseCase).mockReset();
    vi.mocked(logger.info).mockClear();
    vi.mocked(logger.warn).mockClear();
  });

  it("ignora quando a conta do id do botão não existe", async () => {
    const deps = buildDeps({ payable: null });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("ignora quando a conta é de outra organização", async () => {
    const deps = buildDeps({
      payable: buildPayable({ organizationId: "org-2" }),
    });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("idempotente: não faz nada quando a conta encontrada já não está PENDENTE (nem reage de novo)", async () => {
    const deps = buildDeps({ payable: buildPayable({ status: "PAID" }) });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("caminho feliz: confirma o pagamento e reage 👍 na mensagem do lembrete", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).toHaveBeenCalledWith(
      "payable-1",
      "system-user-1",
      "org-1",
      {
        accountsPayableRepository: deps.accountsPayableRepository,
        safeRepository: deps.safeRepository,
      },
      "WHATSAPP",
    );
    expect(deps.whatsAppMessaging.reactToPaymentConfirmed).toHaveBeenCalledWith(
      {
        phone: "5511999999999",
        messageId: "msg-999",
      },
    );
  });

  it("usa accountsPayableReminderWhatsapp em vez de whatsapp quando cadastrado (mesmo destino do lembrete)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      settings: {
        whatsapp: "5511111111111",
        accountsPayableReminderWhatsapp: "5511222222222-group",
      },
    });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(deps.whatsAppMessaging.reactToPaymentConfirmed).toHaveBeenCalledWith(
      {
        phone: "5511222222222-group",
        messageId: "msg-999",
      },
    );
  });

  it("sem lastReminderMessageId (ex.: baixa manual sem lembrete enviado): baixa acontece sem reagir e sem erro", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      payable: buildPayable({ lastReminderMessageId: null }),
    });

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(payAccountsPayableUseCase).toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("reação falha: best-effort, não propaga erro (baixa já confirmada)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});
    vi.mocked(deps.whatsAppMessaging.reactToPaymentConfirmed).mockRejectedValue(
      new Error("Z-API fora do ar"),
    );

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(payAccountsPayableUseCase).toHaveBeenCalled();
  });

  it("grupo: apaga a resposta automática do botão com o messageId da RESPOSTA (não o do lembrete)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      settings: {
        whatsapp: "5511111111111-group",
        accountsPayableReminderWhatsapp: null,
      },
    });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(deps.whatsAppMessaging.deleteButtonReply).toHaveBeenCalledWith({
      phone: "5511111111111-group",
      messageId: "reply-msg-1",
    });
  });

  it("individual (sem sufixo -group): NÃO tenta apagar a resposta, e loga como info (não warn/error)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
      "org-1",
      deps,
    );

    expect(deps.whatsAppMessaging.deleteButtonReply).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("delete da resposta pulado"),
      expect.objectContaining({ accountsPayableId: "payable-1" }),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("sem replyMessageId (payload sem o campo): não tenta apagar a resposta", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      settings: {
        whatsapp: "5511111111111-group",
        accountsPayableReminderWhatsapp: null,
      },
    });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1", replyMessageId: null },
      "org-1",
      deps,
    );

    expect(deps.whatsAppMessaging.deleteButtonReply).not.toHaveBeenCalled();
  });

  it("delete da resposta falha: best-effort, não propaga, e a reação ainda acontece (independência)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      settings: {
        whatsapp: "5511111111111-group",
        accountsPayableReminderWhatsapp: null,
      },
    });
    vi.mocked(deps.whatsAppMessaging.deleteButtonReply).mockRejectedValue(
      new Error("não é admin do grupo"),
    );

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(deps.whatsAppMessaging.reactToPaymentConfirmed).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("apagar a resposta automática"),
      expect.objectContaining({ accountsPayableId: "payable-1" }),
    );
  });

  it("reação falha: o delete da resposta ainda é tentado (independência inversa)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      settings: {
        whatsapp: "5511111111111-group",
        accountsPayableReminderWhatsapp: null,
      },
    });
    vi.mocked(deps.whatsAppMessaging.reactToPaymentConfirmed).mockRejectedValue(
      new Error("Z-API fora do ar"),
    );

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(deps.whatsAppMessaging.deleteButtonReply).toHaveBeenCalledWith({
      phone: "5511111111111-group",
      messageId: "reply-msg-1",
    });
  });

  it("lança NotFoundError quando o usuário de sistema do WhatsApp não existe", async () => {
    const { NotFoundError } = await import("@/core/errors/domain-error");
    const deps = buildDeps({ systemUser: null });

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1", replyMessageId: "reply-msg-1" },
        "org-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });
});
