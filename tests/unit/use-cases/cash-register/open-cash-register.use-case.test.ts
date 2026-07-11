import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { openCashRegisterUseCase } from "@/features/cash-register/application/open-cash-register.use-case";
import {
  CashRegisterAlreadyOpenError,
  InsufficientSafeBalanceError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

function makeRepo(
  overrides: Partial<CashRegisterDayRepository> = {},
): CashRegisterDayRepository {
  return {
    findById: vi.fn(),
    findByOrganizationAndDate: vi.fn().mockResolvedValue(null),
    findLastClosed: vi.fn().mockResolvedValue(null),
    findOpenByOrganization: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
    ...overrides,
  };
}

function makeSafeRepo(balance: string): SafeRepository {
  return {
    findByOrganization: vi.fn(),
    getBalance: vi.fn().mockResolvedValue(new Prisma.Decimal(balance)),
  };
}

const organizationSettingsRepository: OrganizationSettingsRepository = {
  findByOrganization: vi.fn().mockResolvedValue(null),
  update: vi.fn(),
};

describe("openCashRegisterUseCase", () => {
  // Motor de Tesouraria (ADR 2.6/2.8): substitui o antigo cenário de
  // "primeiro uso exige saldo inicial" — agora é sempre uma retirada do Cofre.
  it("bloqueia quando o Cofre não tem saldo suficiente", async () => {
    const repo = makeRepo();
    const safeRepository = makeSafeRepo("50.00");

    await expect(
      openCashRegisterUseCase({ openingBalance: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository: repo,
        safeRepository,
        organizationSettingsRepository,
      }),
    ).rejects.toThrow(InsufficientSafeBalanceError);
  });

  it("abre o caixa retirando openingBalance do Cofre quando há saldo suficiente", async () => {
    const create = vi.fn().mockResolvedValue({ id: "day-1" });
    const repo = makeRepo({ create });
    const safeRepository = makeSafeRepo("2000.00");

    await openCashRegisterUseCase({ openingBalance: 100 }, "user-1", "org-1", {
      cashRegisterDayRepository: repo,
      safeRepository,
      organizationSettingsRepository,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ openingBalance: "100.00" }),
    );
  });

  it("permite openingBalance igual ao saldo exato do Cofre", async () => {
    const create = vi.fn().mockResolvedValue({ id: "day-1" });
    const repo = makeRepo({ create });
    const safeRepository = makeSafeRepo("100.00");

    await expect(
      openCashRegisterUseCase({ openingBalance: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository: repo,
        safeRepository,
        organizationSettingsRepository,
      }),
    ).resolves.not.toThrow();
  });

  it("bloqueia abrir um segundo caixa no mesmo dia/organização", async () => {
    const repo = makeRepo({
      findByOrganizationAndDate: vi.fn().mockResolvedValue({ id: "day-1" }),
    });
    const safeRepository = makeSafeRepo("2000.00");

    await expect(
      openCashRegisterUseCase({ openingBalance: 100 }, "user-1", "org-1", {
        cashRegisterDayRepository: repo,
        safeRepository,
        organizationSettingsRepository,
      }),
    ).rejects.toThrow(CashRegisterAlreadyOpenError);
  });
});
