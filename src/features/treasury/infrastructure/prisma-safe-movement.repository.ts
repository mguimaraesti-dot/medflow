import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  SafeMovementRepository,
  CreateSafeMovementInput,
  ListSafeMovementsFilter,
  DateRangeSignedSum,
  PendingSummary,
} from "../domain/safe-movement.repository";
import type {
  SafeMovement,
  SafeMovementType,
  SafeMovementStatus,
} from "../domain/safe-movement.entity";

const MOVEMENT_INCLUDE = {
  performedBy: { select: { name: true } },
  confirmedBy: { select: { name: true } },
  cancelledBy: { select: { name: true } },
  relatedAccountsPayable: { select: { category: { select: { name: true } } } },
} satisfies Prisma.SafeMovementInclude;

type RawSafeMovement = Prisma.SafeMovementGetPayload<{
  include: typeof MOVEMENT_INCLUDE;
}>;

function toDomainMovement(row: RawSafeMovement): SafeMovement {
  const {
    performedBy,
    confirmedBy,
    cancelledBy,
    relatedAccountsPayable,
    ...movement
  } = row;
  return {
    ...movement,
    performedByUserName: performedBy.name,
    confirmedByUserName: confirmedBy?.name ?? null,
    cancelledByUserName: cancelledBy?.name ?? null,
    categoryName: relatedAccountsPayable?.category.name ?? null,
  };
}

/** Grupos de tipo usados no cálculo de Entradas/Saídas — `MANUAL_ADJUSTMENT` entra num lado ou outro conforme o sinal de `amount`. */
const CREDIT_TYPES: SafeMovementType[] = ["SANGRIA", "CASH_REGISTER_HANDOFF"];
const DEBIT_TYPES: SafeMovementType[] = ["FUNDING", "ACCOUNTS_PAYABLE_PAYMENT"];

export class PrismaSafeMovementRepository implements SafeMovementRepository {
  async create(data: CreateSafeMovementInput): Promise<SafeMovement> {
    const row = await prisma.safeMovement.create({
      data: {
        organizationId: data.organizationId,
        safeId: data.safeId,
        type: data.type,
        amount: data.amount,
        status: data.status,
        relatedCashRegisterDayId: data.relatedCashRegisterDayId,
        performedByUserId: data.performedByUserId,
        reason: data.reason,
      },
      include: MOVEMENT_INCLUDE,
    });
    return toDomainMovement(row);
  }

  async findById(id: string): Promise<SafeMovement | null> {
    const row = await prisma.safeMovement.findUnique({
      where: { id },
      include: MOVEMENT_INCLUDE,
    });
    return row ? toDomainMovement(row) : null;
  }

  async list(
    filter: ListSafeMovementsFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SafeMovement>> {
    const where: Prisma.SafeMovementWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.types &&
        filter.types.length > 0 && { type: { in: filter.types } }),
      ...(filter.status && { status: filter.status }),
      ...(filter.relatedCashRegisterDayId && {
        relatedCashRegisterDayId: filter.relatedCashRegisterDayId,
      }),
      ...((filter.createdAtFrom || filter.createdAtTo) && {
        createdAt: {
          ...(filter.createdAtFrom && { gte: filter.createdAtFrom }),
          ...(filter.createdAtTo && { lte: filter.createdAtTo }),
        },
      }),
      ...(filter.search && {
        OR: [
          { reason: { contains: filter.search, mode: "insensitive" } },
          {
            performedBy: {
              name: { contains: filter.search, mode: "insensitive" },
            },
          },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.safeMovement.findMany({
        where,
        include: MOVEMENT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.safeMovement.count({ where }),
    ]);

    return buildPaginatedResult(items.map(toDomainMovement), total, pagination);
  }

  async sumByCashRegisterDayAndType(
    cashRegisterDayId: string,
    type: SafeMovementType,
  ): Promise<string> {
    const result = await prisma.safeMovement.aggregate({
      where: { relatedCashRegisterDayId: cashRegisterDayId, type },
      _sum: { amount: true },
    });
    return (result._sum.amount ?? new Prisma.Decimal(0)).toFixed(2);
  }

  async confirm(id: string, confirmedByUserId: string): Promise<SafeMovement> {
    const row = await prisma.safeMovement.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedByUserId,
        confirmedAt: new Date(),
      },
      include: MOVEMENT_INCLUDE,
    });
    return toDomainMovement(row);
  }

  async cancel(
    id: string,
    cancelledByUserId: string,
    reason: string,
  ): Promise<SafeMovement> {
    const row = await prisma.safeMovement.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledByUserId,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: MOVEMENT_INCLUDE,
    });
    return toDomainMovement(row);
  }

  async findPendingByCashRegisterDay(
    cashRegisterDayId: string,
  ): Promise<SafeMovement[]> {
    const rows = await prisma.safeMovement.findMany({
      where: { relatedCashRegisterDayId: cashRegisterDayId, status: "PENDING" },
      include: MOVEMENT_INCLUDE,
    });
    return rows.map(toDomainMovement);
  }

  /**
   * Entradas = SANGRIA + CASH_REGISTER_HANDOFF + MANUAL_ADJUSTMENT
   * positivo; Saídas = FUNDING + ACCOUNTS_PAYABLE_PAYMENT +
   * MANUAL_ADJUSTMENT negativo (mesmo agrupamento usado nos filtros
   * rápidos "Entradas"/"Saídas" da tabela). `out` volta como valor
   * absoluto (positivo), pronto pra exibição.
   */
  async sumSignedByDateRangeAndStatus(
    organizationId: string,
    from: Date,
    to: Date,
    status: SafeMovementStatus,
  ): Promise<DateRangeSignedSum> {
    const base: Prisma.SafeMovementWhereInput = {
      organizationId,
      status,
      createdAt: { gte: from, lte: to },
    };

    const [
      creditsResult,
      adjustmentInResult,
      debitsResult,
      adjustmentOutResult,
    ] = await Promise.all([
      prisma.safeMovement.aggregate({
        where: { ...base, type: { in: CREDIT_TYPES } },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: { ...base, type: "MANUAL_ADJUSTMENT", amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: { ...base, type: { in: DEBIT_TYPES } },
        _sum: { amount: true },
      }),
      prisma.safeMovement.aggregate({
        where: { ...base, type: "MANUAL_ADJUSTMENT", amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    const inSum = (creditsResult._sum.amount ?? new Prisma.Decimal(0)).plus(
      adjustmentInResult._sum.amount ?? new Prisma.Decimal(0),
    );
    const outSum = (debitsResult._sum.amount ?? new Prisma.Decimal(0)).plus(
      (adjustmentOutResult._sum.amount ?? new Prisma.Decimal(0)).abs(),
    );

    return { in: inSum.toFixed(2), out: outSum.toFixed(2) };
  }

  async countAndSumPending(organizationId: string): Promise<PendingSummary> {
    const result = await prisma.safeMovement.aggregate({
      where: { organizationId, status: "PENDING" },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return {
      count: result._count._all,
      sum: (result._sum.amount ?? new Prisma.Decimal(0)).toFixed(2),
    };
  }

  async findLastConfirmed(
    organizationId: string,
  ): Promise<SafeMovement | null> {
    const row = await prisma.safeMovement.findFirst({
      where: { organizationId, confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      include: MOVEMENT_INCLUDE,
    });
    return row ? toDomainMovement(row) : null;
  }
}
