import { describe, it, expect, vi } from "vitest";
import { rejectConferenceUseCase } from "@/features/cash-register/application/reject-conference.use-case";
import { CashRegisterNotPendingConferenceError } from "@/core/errors/domain-error";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("rejectConferenceUseCase", () => {
  it("bloqueia quando não há caixa aguardando conferência", async () => {
    const cashRegisterDayRepository = {
      findPendingConferenceByOrganization: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    await expect(
      rejectConferenceUseCase(
        { reason: "Contagem física não bate com o esperado" },
        "manager-1",
        "org-1",
        { cashRegisterDayRepository },
      ),
    ).rejects.toThrow(CashRegisterNotPendingConferenceError);
  });

  it("rejeita a conferência e volta o caixa para OPEN, sem mexer no Cofre", async () => {
    const pendingRegister = { id: "day-1" };
    const rejectConference = vi
      .fn()
      .mockImplementation((id, data) => ({ id, ...data, status: "OPEN" }));

    const cashRegisterDayRepository = {
      findPendingConferenceByOrganization: vi
        .fn()
        .mockResolvedValue(pendingRegister),
      rejectConference,
    } as unknown as CashRegisterDayRepository;

    const result = await rejectConferenceUseCase(
      { reason: "Contagem física não bate com o esperado" },
      "manager-1",
      "org-1",
      { cashRegisterDayRepository },
    );

    expect(rejectConference).toHaveBeenCalledWith("day-1", {
      reason: "Contagem física não bate com o esperado",
    });
    expect(result.status).toBe("OPEN");
  });
});
