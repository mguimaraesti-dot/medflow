import { describe, it, expect, vi } from "vitest";
import { listSafeMovementsUseCase } from "@/features/treasury/application/list-safe-movements.use-case";
import type { SafeMovementRepository } from "@/features/treasury/domain/safe-movement.repository";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { SafeMovement } from "@/features/treasury/domain/safe-movement.entity";

describe("listSafeMovementsUseCase", () => {
  it("repassa type e período de createdAt pro repositório", async () => {
    const result: PaginatedResult<SafeMovement> = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    };
    const list = vi.fn().mockResolvedValue(result);
    const safeMovementRepository = {
      list,
    } as unknown as SafeMovementRepository;

    const createdAtFrom = new Date("2026-07-01T00:00:00.000Z");
    const createdAtTo = new Date("2026-07-31T23:59:59.999Z");

    const output = await listSafeMovementsUseCase(
      { type: "SANGRIA", createdAtFrom, createdAtTo, page: 1, pageSize: 20 },
      "org-1",
      { safeMovementRepository },
    );

    expect(list).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        type: "SANGRIA",
        createdAtFrom,
        createdAtTo,
      },
      { page: 1, pageSize: 20 },
    );
    expect(output).toBe(result);
  });
});
