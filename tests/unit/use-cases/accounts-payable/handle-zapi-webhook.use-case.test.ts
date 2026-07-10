import { describe, it, expect, vi, afterEach } from "vitest";
import { handleZapiWebhookUseCase } from "@/features/accounts-payable/application/handle-zapi-webhook.use-case";
import { payAccountsPayableUseCase } from "@/features/accounts-payable/application/pay-accounts-payable.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { UserRepository } from "@/features/auth/domain/user.repository";

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
    publicToken: "token-1",
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
    findByPublicToken: vi.fn().mockResolvedValue(payable),
  } as unknown as AccountsPayableRepository;

  const systemUser =
    overrides.systemUser === undefined
      ? { id: "system-user-1" }
      : overrides.systemUser;
  const userRepository = {
    findByEmail: vi.fn().mockResolvedValue(systemUser),
  } as unknown as UserRepository;

  const safeRepository = {} as unknown as SafeRepository;

  return { accountsPayableRepository, safeRepository, userRepository };
}

describe("handleZapiWebhookUseCase", () => {
  afterEach(() => {
    vi.mocked(payAccountsPayableUseCase).mockReset();
  });

  it("lança NotFoundError quando o publicToken não corresponde a nenhuma conta", async () => {
    const deps = buildDeps({ payable: null });

    await expect(
      handleZapiWebhookUseCase("token-inexistente", deps),
    ).rejects.toThrow(NotFoundError);
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("idempotente: não faz nada (nem lança erro) quando a conta já não está PENDENTE", async () => {
    const deps = buildDeps({ payable: buildPayable({ status: "PAID" }) });

    await expect(
      handleZapiWebhookUseCase("token-1", deps),
    ).resolves.toBeUndefined();
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("lança NotFoundError quando o usuário de sistema do WhatsApp não existe", async () => {
    const deps = buildDeps({ systemUser: null });

    await expect(handleZapiWebhookUseCase("token-1", deps)).rejects.toThrow(
      NotFoundError,
    );
    expect(payAccountsPayableUseCase).not.toHaveBeenCalled();
  });

  it("caminho feliz: confirma o pagamento com o usuário de sistema e paidVia WHATSAPP", async () => {
    vi.mocked(payAccountsPayableUseCase).mockResolvedValue(
      buildPayable({ status: "PAID" }) as never,
    );
    const deps = buildDeps({});

    await handleZapiWebhookUseCase("token-1", deps);

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
  });
});
