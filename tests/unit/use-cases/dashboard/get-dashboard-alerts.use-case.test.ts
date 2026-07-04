import { describe, it, expect, vi } from "vitest";
import { getDashboardAlertsUseCase } from "@/features/dashboard/application/get-dashboard-alerts.use-case";
import type { CashRegisterDayRepository } from "@/features/cash-register/domain/cash-register-day.repository";
import type { CashFlowEntryRepository } from "@/features/cash-flow/domain/cash-flow-entry.repository";
import type { OrganizationSettingsRepository } from "@/features/organization-settings/domain/organization-settings.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

function buildDeps(overrides: {
  todayRegister?: unknown;
  settings?: unknown;
  reversedCount?: number;
  overdueCount?: number;
}) {
  const cashRegisterDayRepository = {
    findByOrganizationAndDate: vi
      .fn()
      .mockResolvedValue(overrides.todayRegister ?? null),
  } as unknown as CashRegisterDayRepository;

  const cashFlowEntryRepository = {
    countReversedToday: vi.fn().mockResolvedValue(overrides.reversedCount ?? 0),
  } as unknown as CashFlowEntryRepository;

  const organizationSettingsRepository = {
    findByOrganization: vi
      .fn()
      .mockResolvedValue(
        overrides.settings === undefined ? null : overrides.settings,
      ),
  } as unknown as OrganizationSettingsRepository;

  const accountsPayableRepository = {
    list: vi.fn().mockResolvedValue({
      items: [],
      total: overrides.overdueCount ?? 0,
      page: 1,
      pageSize: 1,
      totalPages: 1,
    }),
  } as unknown as AccountsPayableRepository;

  return {
    cashRegisterDayRepository,
    cashFlowEntryRepository,
    organizationSettingsRepository,
    accountsPayableRepository,
  };
}

describe("getDashboardAlertsUseCase", () => {
  it("sem registro hoje e antes do openingTime: não emite alerta de caixa não aberto", async () => {
    const deps = buildDeps({
      settings: { openingTime: "08:00", closingTime: "18:00" },
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T07:00:00.000Z"),
    });

    expect(
      result.alerts.find((a) => a.code === "CASH_REGISTER_NOT_OPENED"),
    ).toBeUndefined();
  });

  it("sem registro hoje e depois do openingTime: emite alerta de caixa não aberto", async () => {
    const deps = buildDeps({
      settings: { openingTime: "08:00", closingTime: "18:00" },
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T09:00:00.000Z"),
    });

    expect(
      result.alerts.find((a) => a.code === "CASH_REGISTER_NOT_OPENED"),
    ).toBeDefined();
  });

  it("caixa aberto antes do closingTime: não emite alerta de caixa não fechado", async () => {
    const deps = buildDeps({
      todayRegister: { status: "OPEN" },
      settings: { openingTime: "08:00", closingTime: "18:00" },
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T15:00:00.000Z"),
    });

    expect(
      result.alerts.find((a) => a.code === "CASH_REGISTER_NOT_CLOSED"),
    ).toBeUndefined();
  });

  it("caixa aberto depois do closingTime: emite alerta de caixa não fechado", async () => {
    const deps = buildDeps({
      todayRegister: { status: "OPEN" },
      settings: { openingTime: "08:00", closingTime: "18:00" },
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T19:00:00.000Z"),
    });

    expect(
      result.alerts.find((a) => a.code === "CASH_REGISTER_NOT_CLOSED"),
    ).toBeDefined();
  });

  it("estornos hoje > 0: emite alerta com a contagem correta na mensagem", async () => {
    const deps = buildDeps({
      todayRegister: { status: "CLOSED" },
      settings: { openingTime: "08:00", closingTime: "18:00" },
      reversedCount: 2,
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T12:00:00.000Z"),
    });

    const alert = result.alerts.find(
      (a) => a.code === "REVERSED_ENTRIES_TODAY",
    );
    expect(alert?.message).toBe("Existem 2 lançamentos estornados hoje.");
  });

  it("nenhuma condição disparada: alerts vazio", async () => {
    const deps = buildDeps({
      todayRegister: { status: "CLOSED" },
      settings: { openingTime: "08:00", closingTime: "18:00" },
      reversedCount: 0,
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T12:00:00.000Z"),
    });

    expect(result.alerts).toEqual([]);
  });

  it("contas vencidas > 0: emite alerta com a contagem correta na mensagem", async () => {
    const deps = buildDeps({
      todayRegister: { status: "CLOSED" },
      settings: { openingTime: "08:00", closingTime: "18:00" },
      overdueCount: 3,
    });

    const result = await getDashboardAlertsUseCase("org-1", {
      ...deps,
      referenceDate: new Date("2026-07-15T12:00:00.000Z"),
    });

    const alert = result.alerts.find((a) => a.code === "OVERDUE_PAYABLES");
    expect(alert?.message).toBe("Existem 3 contas a pagar vencidas.");
  });

  it("organizationSettings nulo: usa fallback (08:00/18:00) sem lançar erro", async () => {
    const deps = buildDeps({ settings: null });

    await expect(
      getDashboardAlertsUseCase("org-1", {
        ...deps,
        referenceDate: new Date("2026-07-15T09:00:00.000Z"),
      }),
    ).resolves.not.toThrow();
  });
});
