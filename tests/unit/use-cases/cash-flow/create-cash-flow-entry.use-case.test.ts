import { describe, it, expect, vi } from "vitest";
import { createCashFlowEntryUseCase } from "@/features/cash-flow/application/create-cash-flow-entry.use-case";
import { CashRegisterNotOpenError } from "@/core/errors/domain-error";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("createCashFlowEntryUseCase", () => {
  // Cenário da matriz: "Caixa fechado -> Não permite novos lançamentos"
  it("bloqueia lançamento quando não há caixa aberto", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;
    const create = vi.fn();
    const cashFlowEntryRepository = {
      create,
    } as unknown as CashFlowEntryRepository;

    await expect(
      createCashFlowEntryUseCase(
        {
          type: "IN",
          amount: 100,
          categoryId: "cat-1",
          paymentMethodId: "pm-1",
        },
        "user-1",
        "org-1",
        { cashFlowEntryRepository, cashRegisterDayRepository },
      ),
    ).rejects.toThrow(CashRegisterNotOpenError);

    expect(create).not.toHaveBeenCalled();
  });

  it("cria o lançamento vinculado ao caixa aberto no momento", async () => {
    const cashRegisterDayRepository = {
      findOpenByOrganization: vi.fn().mockResolvedValue({ id: "day-1" }),
    } as unknown as CashRegisterDayRepository;
    const create = vi.fn().mockResolvedValue({ id: "entry-1", type: "OUT" });
    const cashFlowEntryRepository = {
      create,
    } as unknown as CashFlowEntryRepository;

    await createCashFlowEntryUseCase(
      {
        type: "OUT",
        amount: 50.5,
        categoryId: "cat-2",
        paymentMethodId: "pm-1",
      },
      "user-1",
      "org-1",
      { cashFlowEntryRepository, cashRegisterDayRepository },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        cashRegisterDayId: "day-1",
        amount: "50.50",
        type: "OUT",
      }),
    );
  });
});
