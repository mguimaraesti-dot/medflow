import { describe, it, expect, vi } from "vitest";
import { deactivateRecurringBillUseCase } from "@/features/recurring-bills/application/deactivate-recurring-bill.use-case";
import {
  NotFoundError,
  RecurringBillAlreadyEndedError,
} from "@/core/errors/domain-error";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";

vi.mock("@/core/database/prisma.client", () => ({
  prisma: { auditLog: { create: vi.fn() } },
}));

describe("deactivateRecurringBillUseCase", () => {
  it("bloqueia quando a recorrência não existe ou é de outra organização", async () => {
    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as RecurringBillRepository;

    await expect(
      deactivateRecurringBillUseCase("bill-1", "org-1", "user-1", {
        recurringBillRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia encerrar uma recorrência já encerrada", async () => {
    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "bill-1",
        organizationId: "org-1",
        active: false,
      }),
    } as unknown as RecurringBillRepository;

    await expect(
      deactivateRecurringBillUseCase("bill-1", "org-1", "user-1", {
        recurringBillRepository,
      }),
    ).rejects.toThrow(RecurringBillAlreadyEndedError);
  });

  it("desativa a recorrência e delega ao repositório o id correto", async () => {
    const deactivated = { id: "bill-1", active: false };
    const deactivate = vi.fn().mockResolvedValue(deactivated);
    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue({
        id: "bill-1",
        organizationId: "org-1",
        active: true,
      }),
      deactivate,
    } as unknown as RecurringBillRepository;

    const result = await deactivateRecurringBillUseCase(
      "bill-1",
      "org-1",
      "user-1",
      { recurringBillRepository },
    );

    expect(deactivate).toHaveBeenCalledWith("bill-1");
    expect(result).toBe(deactivated);
  });
});
