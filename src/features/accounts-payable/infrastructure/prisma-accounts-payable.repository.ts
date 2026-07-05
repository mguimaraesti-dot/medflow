import { prisma } from "@/core/database/prisma.client";
import { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  AccountsPayableRepository,
  CreateAccountsPayableInput,
  ListAccountsPayableFilter,
  MarkAsPaidInput,
} from "../domain/accounts-payable.repository";
import type { AccountsPayable } from "../domain/accounts-payable.entity";
import type { AccountsPayableSummary } from "../domain/accounts-payable-summary.entity";

export class PrismaAccountsPayableRepository implements AccountsPayableRepository {
  async findById(id: string): Promise<AccountsPayable | null> {
    return prisma.accountsPayable.findUnique({ where: { id } });
  }

  async list(
    filter: ListAccountsPayableFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<AccountsPayable>> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // "OVERDUE" nunca é persistido — traduz pro par (status PENDING +
    // dueDate no passado). "PENDING" no filtro exclui as vencidas (elas
    // aparecem só no filtro "Vencidas"), mesma lógica do displayStatus.
    let statusFilter: Prisma.AccountsPayableWhereInput = {};
    if (filter.status === "OVERDUE") {
      statusFilter = { status: "PENDING", dueDate: { lt: today } };
    } else if (filter.status === "PENDING") {
      statusFilter = { status: "PENDING", dueDate: { gte: today } };
    } else if (filter.status) {
      statusFilter = { status: filter.status };
    }

    const where: Prisma.AccountsPayableWhereInput = {
      organizationId: filter.organizationId,
      ...statusFilter,
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.search && {
        description: { contains: filter.search, mode: "insensitive" },
      }),
      ...((filter.dueDateFrom || filter.dueDateTo) && {
        dueDate: {
          ...(filter.dueDateFrom && { gte: filter.dueDateFrom }),
          ...(filter.dueDateTo && { lte: filter.dueDateTo }),
        },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.accountsPayable.findMany({
        where,
        orderBy: { dueDate: "asc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.accountsPayable.count({ where }),
    ]);

    return buildPaginatedResult(items, total, pagination);
  }

  async create(data: CreateAccountsPayableInput): Promise<AccountsPayable> {
    return prisma.accountsPayable.create({
      data: {
        organizationId: data.organizationId,
        supplierId: data.supplierId,
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        barcode: data.barcode,
        digitableLine: data.digitableLine,
        pixKey: data.pixKey,
        qrCodeUrl: data.qrCodeUrl,
        boletoPdfUrl: data.boletoPdfUrl,
        recurringBillId: data.recurringBillId,
        createdByUserId: data.createdByUserId,
      },
    });
  }

  async markAsPaid(
    id: string,
    data: MarkAsPaidInput,
  ): Promise<AccountsPayable> {
    return prisma.accountsPayable.update({
      where: { id },
      data: {
        status: "PAID",
        paidByUserId: data.paidByUserId,
        paidAt: new Date(),
        paidVia: data.paidVia,
      },
    });
  }

  async cancel(id: string): Promise<AccountsPayable> {
    return prisma.accountsPayable.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  async getSummary(
    organizationId: string,
    period: { dueDateFrom?: Date; dueDateTo?: Date },
  ): Promise<AccountsPayableSummary> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const periodRange = {
      ...(period.dueDateFrom && { gte: period.dueDateFrom }),
      ...(period.dueDateTo && { lte: period.dueDateTo }),
    };

    const baseWhere: Prisma.AccountsPayableWhereInput = { organizationId };

    const [dueToday, upcoming, overdue, paid] = await Promise.all([
      prisma.accountsPayable.aggregate({
        where: {
          ...baseWhere,
          status: "PENDING",
          dueDate: { ...periodRange, gte: today, lte: endOfToday },
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.accountsPayable.aggregate({
        where: {
          ...baseWhere,
          status: "PENDING",
          dueDate: { ...periodRange, gt: endOfToday },
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.accountsPayable.aggregate({
        where: {
          ...baseWhere,
          status: "PENDING",
          dueDate: { ...periodRange, lt: today },
        },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.accountsPayable.aggregate({
        where: {
          ...baseWhere,
          status: "PAID",
          dueDate: periodRange,
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const toBucket = (result: {
      _count: number;
      _sum: { amount: Prisma.Decimal | null };
    }) => ({
      count: result._count,
      amount: result._sum.amount ?? new Prisma.Decimal(0),
    });

    const dueTodayBucket = toBucket(dueToday);
    const upcomingBucket = toBucket(upcoming);
    const overdueBucket = toBucket(overdue);
    const paidBucket = toBucket(paid);

    return {
      dueToday: dueTodayBucket,
      upcoming: upcomingBucket,
      overdue: overdueBucket,
      paid: paidBucket,
      total: {
        count:
          dueTodayBucket.count +
          upcomingBucket.count +
          overdueBucket.count +
          paidBucket.count,
        amount: dueTodayBucket.amount
          .plus(upcomingBucket.amount)
          .plus(overdueBucket.amount)
          .plus(paidBucket.amount),
      },
    };
  }
}
