import { describe, it, expect, vi } from "vitest";
import { listCashRegisterDaysUseCase } from "@/features/cash-register/application/list-cash-register-days.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { PaginatedResult } from "@/shared/lib/pagination";
import type { CashRegisterDay } from "@/features/cash-register/domain/cash-register-day.entity";

describe("listCashRegisterDaysUseCase", () => {
  it("repassa organizationId e período pro repositório", async () => {
    const result: PaginatedResult<CashRegisterDay> = {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    };
    const list = vi.fn().mockResolvedValue(result);
    const cashRegisterDayRepository = {
      list,
    } as unknown as CashRegisterDayRepository;

    const dateFrom = new Date("2026-07-01T00:00:00.000Z");
    const dateTo = new Date("2026-07-31T23:59:59.999Z");

    const output = await listCashRegisterDaysUseCase(
      { dateFrom, dateTo, page: 1, pageSize: 20 },
      "org-1",
      { cashRegisterDayRepository },
    );

    expect(list).toHaveBeenCalledWith(
      { organizationId: "org-1", dateFrom, dateTo },
      { page: 1, pageSize: 20 },
    );
    expect(output).toBe(result);
  });
});
