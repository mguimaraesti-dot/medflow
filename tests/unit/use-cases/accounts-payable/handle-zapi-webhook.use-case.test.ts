import { describe, it, expect, vi, afterEach } from "vitest";
import {
  handleZapiWebhookUseCase,
  handleZapiReactionWebhookUseCase,
} from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import { PayableAlreadyProcessedError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
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
    lastReminderMessageId: "msg-999",
    ...overrides,
  };
}

function buildDeps(overrides: {
  payable?: Record<string, unknown> | null;
  reactionPayable?: Record<string, unknown> | null;
  systemUser?: { id: string } | null;
  settings?: {
    whatsapp: string | null;
    accountsPayableReminderWhatsapp: string | null;
  } | null;
}) {
  const payable =
    overrides.payable === undefined ? buildPayable() : overrides.payable;
  const reactionPayable =
    overrides.reactionPayable === undefined
      ? payable
      : overrides.reactionPayable;
  const accountsPayableRepository = {
    findById: vi.fn().mockResolvedValue(payable),
    findByReminderMessageId: vi.fn().mockResolvedValue(reactionPayable),
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
  });

  it("ignora quando a conta do id do botão não existe", async () => {
    const deps = buildDeps({ payable: null });

    await handleZapiWebhookUseCase(
      { accountsPayableId: "payable-1" },
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
      { accountsPayableId: "payable-1" },
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
      { accountsPayableId: "payable-1" },
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
      { accountsPayableId: "payable-1" },
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
      { accountsPayableId: "payable-1" },
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
        { accountsPayableId: "payable-1" },
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
        { accountsPayableId: "payable-1" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(payAccountsPayableUseCase).toHaveBeenCalled();
  });

  it("lança NotFoundError quando o usuário de sistema do WhatsApp não existe", async () => {
    const { NotFoundError } = await import("@/core/errors/domain-error");
    const deps = buildDeps({ systemUser: null });

    await expect(
      handleZapiWebhookUseCase(
        { accountsPayableId: "payable-1" },
        "org-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });
});

describe("handleZapiReactionWebhookUseCase (gatilho de baixa por reação 👍)", () => {
  afterEach(() => {
    vi.mocked(payAccountsPayableUseCase).mockReset();
  });

  it("cenário 1: reação bate com lastReminderMessageId de conta PENDENTE → dá baixa (reaproveita o núcleo do clique)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});

    await handleZapiReactionWebhookUseCase(
      { referencedMessageId: "msg-999" },
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
    expect(deps.whatsAppMessaging.reactToPaymentConfirmed).toHaveBeenCalled();
  });

  it("cenário 2: reação bate com um id EXTRA (boleto ou Pix) de conta PENDENTE → dá baixa, e a confirmação 🆗 mira a PRINCIPAL, não o id extra", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({
      reactionPayable: buildPayable({
        lastReminderMessageId: "msg-999",
        reminderExtraMessageIds: ["msg-boleto-1", "msg-pix-1"],
      }),
    });

    await handleZapiReactionWebhookUseCase(
      { referencedMessageId: "msg-boleto-1" },
      "org-1",
      deps,
    );

    expect(
      deps.accountsPayableRepository.findByReminderMessageId,
    ).toHaveBeenCalledWith("msg-boleto-1");
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

  it("cenário 3: reação numa mensagem que não é lembrete (nenhuma conta com esse lastReminderMessageId) → nada acontece", async () => {
    const deps = buildDeps({ reactionPayable: null });

    await handleZapiReactionWebhookUseCase(
      { referencedMessageId: "msg-desconhecida" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("cenário 4: conta já paga, reação 👍 de novo → não refaz baixa (idempotência, cobre múltiplas pessoas reagindo em grupo)", async () => {
    const deps = buildDeps({
      reactionPayable: buildPayable({ status: "PAID" }),
    });

    await handleZapiReactionWebhookUseCase(
      { referencedMessageId: "msg-999" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("ignora quando a conta encontrada é de outra organização", async () => {
    const deps = buildDeps({
      reactionPayable: buildPayable({ organizationId: "org-2" }),
    });

    await handleZapiReactionWebhookUseCase(
      { referencedMessageId: "msg-999" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("idempotência atômica: 2 reações quase simultâneas (ex.: 👍 no boleto E no Pix) — a que perde a corrida (markAsPaid lança PayableAlreadyProcessedError) é ignorada silenciosamente, sem propagar erro e sem reagir 🆗 de novo", async () => {
    vi.mocked(payAccountsPayableUseCase).mockRejectedValue(
      new PayableAlreadyProcessedError("payable-1"),
    );
    const deps = buildDeps({});

    await expect(
      handleZapiReactionWebhookUseCase(
        { referencedMessageId: "msg-999" },
        "org-1",
        deps,
      ),
    ).resolves.toBeUndefined();

    expect(
      deps.whatsAppMessaging.reactToPaymentConfirmed,
    ).not.toHaveBeenCalled();
  });

  it("erros que não são PayableAlreadyProcessedError continuam propagando normalmente (não viram idempotência silenciosa)", async () => {
    const { InsufficientSafeBalanceError } =
      await import("@/core/errors/domain-error");
    vi.mocked(payAccountsPayableUseCase).mockRejectedValue(
      new InsufficientSafeBalanceError("org-1", "150.00", "10.00"),
    );
    const deps = buildDeps({});

    await expect(
      handleZapiReactionWebhookUseCase(
        { referencedMessageId: "msg-999" },
        "org-1",
        deps,
      ),
    ).rejects.toThrow(InsufficientSafeBalanceError);
  });
});
