import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getSafeSummaryUseCase } from "@/features/treasury/application/get-safe-summary.use-case";
import type { SafeRepository } from "@/features/treasury/domain/safe.repository";

describe("getSafeSummaryUseCase", () => {
  it("repassa organizationId pro repositório e retorna o saldo", async () => {
    const balance = new Prisma.Decimal("1234.56");
    const getBalance = vi.fn().mockResolvedValue(balance);
    const safeRepository = { getBalance } as unknown as SafeRepository;

    const result = await getSafeSummaryUseCase("org-1", { safeRepository });

    expect(getBalance).toHaveBeenCalledWith("org-1");
    expect(result).toBe(balance);
  });
});
