import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  CashFlowEntryRepository,
  CreateCashFlowEntryInput,
  ListCashFlowEntriesFilter,
  CashFlowEntrySums,
  CashFlowEntryProjection,
  CashFlowEntryInsightProjection,
} from "../domain/cash-flow-entry.repository";
import type { CashFlowEntry } from "../domain/cash-flow-entry.entity";

const CREATED_BY_INCLUDE = { createdBy: { select: { name: true } } } as const;

type RowWithCreatedBy = Prisma.CashFlowEntryGetPayload<{
  include: typeof CREATED_BY_INCLUDE;
}>;

/** Achata `row.createdBy.name` no campo denormalizado do domínio — nunca expõe o tipo do Prisma. */
function toDomainEntry(row: RowWithCreatedBy): CashFlowEntry {
  const { createdBy, ...entry } = row;
  return { ...entry, createdByUserName: createdBy.name };
}

export class PrismaCashFlowEntryRepository implements CashFlowEntryRepository {
  async findById(id: string): Promise<CashFlowEntry | null> {
    const row = await prisma.cashFlowEntry.findUnique({
      where: { id },
      include: CREATED_BY_INCLUDE,
    });
    return row ? toDomainEntry(row) : null;
  }

  async list(
    filter: ListCashFlowEntriesFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CashFlowEntry>> {
    const where: Prisma.CashFlowEntryWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.cashRegisterDayId && {
        cashRegisterDayId: filter.cashRegisterDayId,
      }),
      ...(filter.type && { type: filter.type }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...((filter.dateFrom || filter.dateTo) && {
        occurredAt: {
          ...(filter.dateFrom && { gte: filter.dateFrom }),
          ...(filter.dateTo && { lte: filter.dateTo }),
        },
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.cashFlowEntry.findMany({
        where,
        include: CREATED_BY_INCLUDE,
        orderBy: { occurredAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.cashFlowEntry.count({ where }),
    ]);

    return buildPaginatedResult(rows.map(toDomainEntry), total, pagination);
  }

  async create(data: CreateCashFlowEntryInput): Promise<CashFlowEntry> {
    const row = await prisma.cashFlowEntry.create({
      data: {
        organizationId: data.organizationId,
        cashRegisterDayId: data.cashRegisterDayId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        occurredAt: data.occurredAt ?? new Date(),
        categoryId: data.categoryId,
        paymentMethodId: data.paymentMethodId,
        accountsPayableId: data.accountsPayableId,
        createdByUserId: data.createdByUserId,
      },
      include: CREATED_BY_INCLUDE,
    });
    return toDomainEntry(row);
  }

  /**
   * Regra de dupla checagem intencional: o use case (Task 5A) já valida
   * `isReversed` antes de chamar este método — isso dá uma mensagem de
   * erro rápida e é o que cobre o cenário "duplo estorno" nos testes
   * unitários. Esta segunda checagem, aqui dentro da transação, é uma
   * rede de segurança contra corrida entre duas requisições simultâneas
   * tentando estornar o mesmo lançamento ao mesmo tempo — algo que só um
   * teste de integração real contra o banco conseguiria pegar.
   */
  async reverse(
    entryId: string,
    reversedByUserId: string,
    description?: string,
  ): Promise<{ original: CashFlowEntry; reversal: CashFlowEntry }> {
    return prisma.$transaction(async (tx) => {
      const original = await tx.cashFlowEntry.findUniqueOrThrow({
        where: { id: entryId },
      });

      if (original.isReversed) {
        throw new Error(`CashFlowEntry ${entryId} já foi estornado.`);
      }

      const reversal = await tx.cashFlowEntry.create({
        data: {
          organizationId: original.organizationId,
          cashRegisterDayId: original.cashRegisterDayId,
          type: original.type === "IN" ? "OUT" : "IN",
          amount: original.amount,
          description:
            description ?? `Estorno referente ao lançamento #${original.id}`,
          categoryId: original.categoryId,
          paymentMethodId: original.paymentMethodId,
          createdByUserId: reversedByUserId,
          reversalOfEntryId: original.id,
        },
        include: CREATED_BY_INCLUDE,
      });

      const updatedOriginal = await tx.cashFlowEntry.update({
        where: { id: original.id },
        data: { isReversed: true },
        include: CREATED_BY_INCLUDE,
      });

      return {
        original: toDomainEntry(updatedOriginal),
        reversal: toDomainEntry(reversal),
      };
    });
  }

  async sumByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntrySums> {
    const [inSum, outSum] = await Promise.all([
      prisma.cashFlowEntry.aggregate({
        where: { cashRegisterDayId, type: "IN" },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: { cashRegisterDayId, type: "OUT" },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalIn: (inSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalOut: (outSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    };
  }

  async sumCashOnlyByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntrySums> {
    const [inSum, outSum] = await Promise.all([
      prisma.cashFlowEntry.aggregate({
        where: {
          cashRegisterDayId,
          type: "IN",
          paymentMethod: { isCash: true },
        },
        _sum: { amount: true },
      }),
      prisma.cashFlowEntry.aggregate({
        where: {
          cashRegisterDayId,
          type: "OUT",
          paymentMethod: { isCash: true },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalIn: (inSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
      totalOut: (outSum._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    };
  }

  async listByDateRange(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<CashFlowEntryProjection[]> {
    return prisma.cashFlowEntry.findMany({
      where: { organizationId, occurredAt: { gte: from, lte: to } },
      select: { type: true, amount: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
  }

  async countReversedToday(
    organizationId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    return prisma.cashFlowEntry.count({
      where: {
        organizationId,
        isReversed: true,
        occurredAt: { gte: from, lte: to },
      },
    });
  }

  async listByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<CashFlowEntryInsightProjection[]> {
    return prisma.cashFlowEntry.findMany({
      where: { cashRegisterDayId },
      select: { type: true, amount: true, occurredAt: true, categoryId: true },
      orderBy: { occurredAt: "asc" },
    });
  }
}
