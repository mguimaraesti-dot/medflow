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
    ...overrides,
  };
}

function buildDeps(overrides: {
  payable?: Record<string, unknown> | null;
  systemUser?: { id: string } | null;
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

  it("ignora quando a conta do id do botão não existe", async () => {
    const deps = buildDeps({ payable: null });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", accountsPayableId: "payable-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("ignora quando a conta é de outra organização", async () => {
    const deps = buildDeps({
      payable: buildPayable({ organizationId: "org-2" }),
    });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", accountsPayableId: "payable-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("idempotente: não faz nada quando a conta encontrada já não está PENDENTE", async () => {
    const deps = buildDeps({ payable: buildPayable({ status: "PAID" }) });

    await handleZapiWebhookUseCase(
      { phone: "11999999999", accountsPayableId: "payable-1" },
      "org-1",
      deps,
    );

    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("caminho feliz: confirma o pagamento e manda mensagem de agradecimento de volta", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});

    await handleZapiWebhookUseCase(
      { phone: "11988887777", accountsPayableId: "payable-1" },
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
    expect(
      deps.whatsAppMessaging.sendPaymentConfirmedMessage,
    ).toHaveBeenCalledWith("11988887777");
  });

  it("caminho feliz: mesmo se a mensagem de agradecimento falhar, o pagamento já foi confirmado (best-effort)", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});
    vi.mocked(
      deps.whatsAppMessaging.sendPaymentConfirmedMessage,
    ).mockRejectedValue(new Error("Z-API fora do ar"));

    await expect(
      handleZapiWebhookUseCase(
        { phone: "11988887777", accountsPayableId: "payable-1" },
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
        { phone: "11999999999", accountsPayableId: "payable-1" },
        "org-1",
        deps,
      ),
    ).rejects.toThrow(NotFoundError);
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });
});
