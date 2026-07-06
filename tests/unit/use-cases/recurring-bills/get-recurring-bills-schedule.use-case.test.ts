import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { getRecurringBillsScheduleUseCase } from "@/features/recurring-bills/application/get-recurring-bills-schedule.use-case";
import type { RecurringBillRepository } from "@/features/recurring-bills/domain/recurring-bill.repository";
import type { AccountsPayableRepository } from "@/features/accounts-payable/domain/accounts-payable.repository";

const bill = (overrides: Record<string, unknown> = {}) => ({
  id: "bill-1",
  organizationId: "org-1",
  supplierId: "supplier-1",
  categoryId: "cat-1",
  description: "Aluguel",
  amount: new Prisma.Decimal("2500"),
  dueDay: 5,
  active: true,
  periodicity: "MONTHLY",
  maxOccurrences: null,
  firstDueDate: new Date("2026-07-05T00:00:00.000Z"),
  ...overrides,
});

const occurrence = (overrides: Record<string, unknown> = {}) => ({
  id: "payable-1",
  recurringBillId: "bill-1",
  dueDate: new Date("2027-01-05T00:00:00.000Z"),
  amount: new Prisma.Decimal("2500"),
  status: "PENDING",
  ...overrides,
});

describe("getRecurringBillsScheduleUseCase", () => {
  it("retorna vazio quando não há recorrências ativas", async () => {
    const recurringBillRepository = {
      listActive: vi.fn().mockResolvedValue([]),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBillIdsInRange: vi.fn(),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillsScheduleUseCase(1, 2027, "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.rows).toEqual([]);
    expect(result.summary.quantidade).toBe(0);
    expect(
      accountsPayableRepository.listByRecurringBillIdsInRange,
    ).not.toHaveBeenCalled();
  });

  it('exibe "-" (dueDate null) quando a recorrência não tem ocorrência real no mês', async () => {
    const recurringBillRepository = {
      listActive: vi.fn().mockResolvedValue([bill()]),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBillIdsInRange: vi.fn().mockResolvedValue([]),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillsScheduleUseCase(1, 2027, "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].dueDate).toBeNull();
    expect(result.rows[0].amount).toBeNull();
    expect(result.rows[0].status).toBeNull();
    expect(result.summary.quantidade).toBe(0);
  });

  it("preenche a ocorrência real quando existe pro mês selecionado", async () => {
    const recurringBillRepository = {
      listActive: vi.fn().mockResolvedValue([bill()]),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBillIdsInRange: vi.fn().mockResolvedValue([occurrence()]),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillsScheduleUseCase(1, 2027, "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].accountsPayableId).toBe("payable-1");
    expect(result.rows[0].status).toBe("PENDING");
    expect(result.summary.quantidade).toBe(1);
    expect(result.summary.totalPrevisto.toString()).toBe("2500");
  });

  it("exclui ocorrências CANCELLED do total previsto e da quantidade", async () => {
    const recurringBillRepository = {
      listActive: vi
        .fn()
        .mockResolvedValue([
          bill(),
          bill({ id: "bill-2", description: "Internet" }),
        ]),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBillIdsInRange: vi.fn().mockResolvedValue([
        occurrence({ status: "CANCELLED" }),
        occurrence({
          id: "payable-2",
          recurringBillId: "bill-2",
          amount: new Prisma.Decimal("100"),
          status: "PENDING",
        }),
      ]),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillsScheduleUseCase(1, 2027, "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.summary.quantidade).toBe(1);
    expect(result.summary.totalPrevisto.toString()).toBe("100");
  });

  it("calcula maior despesa e próxima geração corretamente", async () => {
    const recurringBillRepository = {
      listActive: vi
        .fn()
        .mockResolvedValue([
          bill(),
          bill({ id: "bill-2", description: "IPTU" }),
        ]),
    } as unknown as RecurringBillRepository;
    const accountsPayableRepository = {
      listByRecurringBillIdsInRange: vi.fn().mockResolvedValue([
        occurrence({
          dueDate: new Date("2027-01-20T00:00:00.000Z"),
          amount: new Prisma.Decimal("2500"),
        }),
        occurrence({
          id: "payable-2",
          recurringBillId: "bill-2",
          description: "IPTU",
          dueDate: new Date("2027-01-10T00:00:00.000Z"),
          amount: new Prisma.Decimal("8500"),
        }),
      ]),
    } as unknown as AccountsPayableRepository;

    const result = await getRecurringBillsScheduleUseCase(1, 2027, "org-1", {
      recurringBillRepository,
      accountsPayableRepository,
    });

    expect(result.summary.maiorDespesa?.amount.toString()).toBe("8500");
    expect(result.summary.proximaGeracao?.dueDate).toEqual(
      new Date("2027-01-10T00:00:00.000Z"),
    );
  });
});
