import { describe, it, expect, vi } from "vitest";
import { openCashRegisterUseCase } from "@/features/cash-register/application/open-cash-register.use-case";
import {
  CashRegisterAlreadyOpenError,
  FirstUseRequiresOpeningBalanceError,
} from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

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
    create: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn(),
    ...overrides,
  };
}

describe("openCashRegisterUseCase", () => {
  // Cenário da matriz: "Primeiro uso do sistema -> Solicita saldo inicial"
  it("exige openingBalance quando é o primeiro uso (sem caixa fechado anterior)", async () => {
    const repo = makeRepo();

    await expect(
      openCashRegisterUseCase({}, "user-1", "org-1", {
        cashRegisterDayRepository: repo,
      }),
    ).rejects.toThrow(FirstUseRequiresOpeningBalanceError);
  });

  // Cenário da matriz: "Dia seguinte -> Herda automaticamente o saldo final anterior"
  it("herda o closingBalance do último caixa fechado, ignorando openingBalance do input", async () => {
    const lastClosed = {
      id: "day-0",
      // Decimal-like mínimo (só o método que o use case realmente chama)
      // em vez de `new Prisma.Decimal(...)` — mantém este teste unitário
      // desacoplado do Prisma Client gerado.
      closingBalance: { toFixed: (n: number) => (150.75).toFixed(n) },
    };
    const create = vi.fn().mockResolvedValue({ id: "day-1" });
    const repo = makeRepo({
      findLastClosed: vi.fn().mockResolvedValue(lastClosed),
      create,
    });

    await openCashRegisterUseCase({ openingBalance: 9999 }, "user-1", "org-1", {
      cashRegisterDayRepository: repo,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ openingBalance: "150.75" }),
    );
  });

  it("bloqueia abrir um segundo caixa no mesmo dia/organização", async () => {
    const repo = makeRepo({
      findByOrganizationAndDate: vi.fn().mockResolvedValue({ id: "day-1" }),
    });

    await expect(
      openCashRegisterUseCase({}, "user-1", "org-1", {
        cashRegisterDayRepository: repo,
      }),
    ).rejects.toThrow(CashRegisterAlreadyOpenError);
  });
});
