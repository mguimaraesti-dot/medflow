import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  SafeMovementRepository,
  CreateSafeMovementInput,
  ListSafeMovementsFilter,
} from "../domain/safe-movement.repository";
import type {
  SafeMovement,
  SafeMovementType,
} from "../domain/safe-movement.entity";

export class PrismaSafeMovementRepository implements SafeMovementRepository {
  async create(data: CreateSafeMovementInput): Promise<SafeMovement> {
    return prisma.safeMovement.create({
      data: {
        organizationId: data.organizationId,
        safeId: data.safeId,
        type: data.type,
        amount: data.amount,
        relatedCashRegisterDayId: data.relatedCashRegisterDayId,
        performedByUserId: data.performedByUserId,
        reason: data.reason,
      },
    });
  }

  async list(
    filter: ListSafeMovementsFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SafeMovement>> {
    const where: Prisma.SafeMovementWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.type && { type: filter.type }),
      ...(filter.relatedCashRegisterDayId && {
        relatedCashRegisterDayId: filter.relatedCashRegisterDayId,
      }),
      ...((filter.createdAtFrom || filter.createdAtTo) && {
        createdAt: {
          ...(filter.createdAtFrom && { gte: filter.createdAtFrom }),
          ...(filter.createdAtTo && { lte: filter.createdAtTo }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.safeMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.safeMovement.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pagination);
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
}
