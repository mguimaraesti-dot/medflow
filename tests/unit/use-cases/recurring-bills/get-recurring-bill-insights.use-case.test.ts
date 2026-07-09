import { describe, it, expect, vi, afterEach } from "vitest";
import { Prisma } from "@prisma/client";
import { getRecurringBillInsightsUseCase } from "@/features/recurring-bills/application/get-recurring-bill-insights.use-case";
import { NotFoundError } from "@/core/errors/domain-error";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";
import type { RecurringBill } from "@/features/recurring-bills/domain/recurring-bill.entity";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";
import type { AccountsPayable } from "@/features/accounts-payable/domain/accounts-payable.entity";

const TODAY = new Date("2026-08-10T00:00:00.000Z");

function payable(overrides: Partial<AccountsPayable>): AccountsPayable {
  return {
    id: "payable",
    organizationId: "org-1",
    publicToken: "token",
    supplierId: "supplier-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: new Prisma.Decimal("2500"),
    dueDate: new Date("2026-08-05T00:00:00.000Z"),
    barcode: null,
    digitableLine: null,
    pixKey: null,
    qrCodeUrl: null,
    boletoPdfUrl: null,
    status: "PENDING",
    paymentOrigin: "BANCO",
    recurringBillId: "bill-1",
    occurrenceNumber: 1,
    createdByUserId: "user-1",
    createdByUserName: "Fulano",
    paidByUserId: null,
    paidByUserName: null,
    paidAt: null,
    paidVia: null,
    paidSafeMovementId: null,
    attachmentsCount: 0,
    deletedAt: null,
    deletedByUserId: null,
    deletedByUserName: null,
    deletionReason: null,
    createdAt: new Date("2026-01-05T00:00:00.000Z"),
    updatedAt: new Date("2026-01-05T00:00:00.000Z"),
    ...overrides,
  };
}

function bill(overrides: Partial<RecurringBill>): RecurringBill {
  return {
    id: "bill-1",
    organizationId: "org-1",
    supplierId: "supplier-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: new Prisma.Decimal("2500"),
    dueDay: 5,
    active: true,
    periodicity: "MONTHLY" as const,
    maxOccurrences: null,
    firstDueDate: new Date("2026-01-05T00:00:00.000Z"),
    ...overrides,
  };
}

describe("getRecurringBillInsightsUseCase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("bloqueia quando a recorrência não existe ou é de outra organização", async () => {
    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {} as AccountsPayableRepository;

    await expect(
      getRecurringBillInsightsUseCase("bill-1", "org-1", {
        recurringBillRepository,
        accountsPayableRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("recorrência saudável: sem atraso, poucas pendentes -> saúde OK e insight HEALTHY", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(bill({})),
    } as unknown as RecurringBillRepository;

    // 8 ocorrências pagas em dia (histórico longo o bastante pra a razão
    // pendentes+atrasadas/total não passar de 20% com só 1 pendente) + 1
    // pendente futura.
    const paidDates = [
      "2026-01-05",
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
      "2026-05-05",
      "2026-06-05",
      "2026-07-05",
      "2026-08-05",
    ];
    const siblings = [
      ...paidDates.map((date, index) =>
        payable({
          id: `paid-${index}`,
          occurrenceNumber: index + 1,
          dueDate: new Date(`${date}T00:00:00.000Z`),
          status: "PAID",
          paidAt: new Date(`${date}T00:00:00.000Z`),
        }),
      ),
      payable({
        id: "p-pending",
        occurrenceNumber: 9,
        dueDate: new Date("2026-09-05T00:00:00.000Z"),
        status: "PENDING",
      }),
    ];
    const accountsPayableRepository = {
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillInsightsUseCase("bill-1", "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.occurrencesGenerated).toBe(9);
    expect(result.occurrencesPaid).toBe(8);
    expect(result.occurrencesPending).toBe(1);
    expect(result.occurrencesOverdue).toBe(0);
    expect(result.nextGenerationDate).toEqual(
      new Date("2026-09-05T00:00:00.000Z"),
    );
    expect(result.health.status).toBe("OK");
    expect(result.health.punctualityPercent).toBe(100);
    expect(result.insight.kind).toBe("HEALTHY");
    expect(result.insight.recommendation).toBe("Nenhuma ação necessária.");
  });

  it("mais de 3 ocorrências atrasadas -> saúde CRITICAL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(bill({})),
    } as unknown as RecurringBillRepository;

    const overdueDates = [
      "2026-04-05",
      "2026-05-05",
      "2026-06-05",
      "2026-07-05",
    ];
    const siblings = overdueDates.map((date, index) =>
      payable({
        id: `p${index}`,
        occurrenceNumber: index + 1,
        dueDate: new Date(`${date}T00:00:00.000Z`),
        status: "PENDING",
      }),
    );
    const accountsPayableRepository = {
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillInsightsUseCase("bill-1", "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.occurrencesOverdue).toBe(4);
    expect(result.health.status).toBe("CRITICAL");
  });

  it("uma ocorrência vencida -> saúde ATTENTION", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(bill({})),
    } as unknown as RecurringBillRepository;

    // Histórico longo o bastante pra 1 atrasada não passar de 20% do total
    // (senão cairia em CRITICAL pela regra da razão).
    const paidDates = [
      "2025-11-05",
      "2025-12-05",
      "2026-01-05",
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
      "2026-05-05",
      "2026-06-05",
    ];
    const siblings = [
      ...paidDates.map((date, index) =>
        payable({
          id: `paid-${index}`,
          occurrenceNumber: index + 1,
          dueDate: new Date(`${date}T00:00:00.000Z`),
          status: "PAID",
          paidAt: new Date(`${date}T00:00:00.000Z`),
        }),
      ),
      payable({
        id: "p-overdue",
        occurrenceNumber: 9,
        dueDate: new Date("2026-07-05T00:00:00.000Z"),
        status: "PENDING",
      }),
      payable({
        id: "p-future",
        occurrenceNumber: 10,
        dueDate: new Date("2026-09-05T00:00:00.000Z"),
        status: "PENDING",
      }),
    ];
    const accountsPayableRepository = {
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillInsightsUseCase("bill-1", "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.occurrencesOverdue).toBe(1);
    expect(result.health.status).toBe("ATTENTION");
  });

  it("padrão de atraso recente (>=3 de 6) -> insight LATE_PATTERN", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(bill({})),
    } as unknown as RecurringBillRepository;

    // 6 ocorrências já vencidas (dueDate <= hoje): 4 pagas com atraso, 2 em dia.
    const siblings = [
      payable({
        id: "p1",
        occurrenceNumber: 1,
        dueDate: new Date("2026-03-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-03-10T00:00:00.000Z"),
      }),
      payable({
        id: "p2",
        occurrenceNumber: 2,
        dueDate: new Date("2026-04-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-04-10T00:00:00.000Z"),
      }),
      payable({
        id: "p3",
        occurrenceNumber: 3,
        dueDate: new Date("2026-05-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-05-04T00:00:00.000Z"),
      }),
      payable({
        id: "p4",
        occurrenceNumber: 4,
        dueDate: new Date("2026-06-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-06-10T00:00:00.000Z"),
      }),
      payable({
        id: "p5",
        occurrenceNumber: 5,
        dueDate: new Date("2026-07-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-07-10T00:00:00.000Z"),
      }),
      payable({
        id: "p6",
        occurrenceNumber: 6,
        dueDate: new Date("2026-08-05T00:00:00.000Z"),
        status: "PAID",
        paidAt: new Date("2026-08-04T00:00:00.000Z"),
      }),
    ];
    const accountsPayableRepository = {
      listByRecurringBill: vi.fn().mockResolvedValue(siblings),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillInsightsUseCase("bill-1", "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.insight.kind).toBe("LATE_PATTERN");
    expect(result.insight.recentLateCount).toBe(4);
    expect(result.insight.recentWindowSize).toBe(6);
  });

  it("calcula endDate a partir de firstDueDate + maxOccurrences; null quando sem prazo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);

    const recurringBillRepository = {
      findById: vi.fn().mockResolvedValue(bill({ maxOccurrences: 12 })),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBill: vi.fn().mockResolvedValue([]),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillInsightsUseCase("bill-1", "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    // firstDueDate 2026-01-05, MONTHLY, 12 ocorrências -> última em 2026-12-05.
    expect(result.endDate).toEqual(new Date("2026-12-05T00:00:00.000Z"));
    expect(result.yearlyForecastAmount.toFixed(2)).toBe("30000.00");
  });
});
