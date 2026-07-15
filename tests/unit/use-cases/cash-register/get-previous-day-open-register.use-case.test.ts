import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getPreviousDayOpenRegisterUseCase } from "@/features/cash-register/application/get-previous-day-open-register.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";

const organizationSettingsRepository: OrganizationSettingsRepository = {
  findByOrganization: vi.fn().mockResolvedValue(null),
  update: vi.fn(),
};

describe("getPreviousDayOpenRegisterUseCase", () => {
  it("retorna null quando não existe nenhum OPEN de data anterior", async () => {
    const cashRegisterDayRepository = {
      findOldestOpenBefore: vi.fn().mockResolvedValue(null),
    } as unknown as CashRegisterDayRepository;

    const result = await getPreviousDayOpenRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      organizationSettingsRepository,
    });

    expect(result).toBeNull();
  });

  it("projeta id/date/openingBalance quando existe um OPEN de data anterior", async () => {
    const cashRegisterDayRepository = {
      findOldestOpenBefore: vi.fn().mockResolvedValue({
        id: "day-old",
        date: new Date("2026-07-14T00:00:00.000Z"),
        openingBalance: new Prisma.Decimal("40.00"),
      }),
    } as unknown as CashRegisterDayRepository;

    const result = await getPreviousDayOpenRegisterUseCase("org-1", {
      cashRegisterDayRepository,
      organizationSettingsRepository,
    });

    expect(result).toEqual({
      id: "day-old",
      date: new Date("2026-07-14T00:00:00.000Z"),
      openingBalance: "40.00",
    });
  });
});
