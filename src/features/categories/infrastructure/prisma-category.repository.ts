import { prisma } from "@/core/database/prisma.client";
import type { Prisma } from "@prisma/client";
import type {
  CategoryLinkedRecordsCount,
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../domain/category.repository";
import type { Category, CategoryType } from "../domain/category.entity";

export class PrismaCategoryRepository implements CategoryRepository {
  async listActive(
    organizationId: string,
    type?: CategoryType,
  ): Promise<Category[]> {
    const where: Prisma.CategoryWhereInput = {
      organizationId,
      active: true,
      ...(type && { type }),
    };

    return prisma.category.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const last = await prisma.category.aggregate({
      where: { organizationId: data.organizationId, type: data.type },
      _max: { displayOrder: true },
    });

    return prisma.category.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        color: data.color,
        displayOrder: (last._max.displayOrder ?? 0) + 1,
      },
    });
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    return prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        color: data.color,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  async countLinkedRecords(id: string): Promise<CategoryLinkedRecordsCount> {
    const [accountsPayable, cashFlowEntries, recurringBills] =
      await Promise.all([
        prisma.accountsPayable.count({ where: { categoryId: id } }),
        prisma.cashFlowEntry.count({ where: { categoryId: id } }),
        prisma.recurringBill.count({ where: { categoryId: id } }),
      ]);
    return { accountsPayable, cashFlowEntries, recurringBills };
  }

  async countLinkedRecordsByOrganization(
    organizationId: string,
  ): Promise<Map<string, CategoryLinkedRecordsCount>> {
    const [accountsPayableGroups, cashFlowEntryGroups, recurringBillGroups] =
      await Promise.all([
        prisma.accountsPayable.groupBy({
          by: ["categoryId"],
          where: { organizationId },
          _count: { _all: true },
        }),
        prisma.cashFlowEntry.groupBy({
          by: ["categoryId"],
          where: { organizationId },
          _count: { _all: true },
        }),
        prisma.recurringBill.groupBy({
          by: ["categoryId"],
          where: { organizationId },
          _count: { _all: true },
        }),
      ]);

    const counts = new Map<string, CategoryLinkedRecordsCount>();
    const empty = (): CategoryLinkedRecordsCount => ({
      accountsPayable: 0,
      cashFlowEntries: 0,
      recurringBills: 0,
    });

    for (const group of accountsPayableGroups) {
      counts.set(group.categoryId, {
        ...empty(),
        accountsPayable: group._count._all,
      });
    }
    for (const group of cashFlowEntryGroups) {
      const existing = counts.get(group.categoryId) ?? empty();
      counts.set(group.categoryId, {
        ...existing,
        cashFlowEntries: group._count._all,
      });
    }
    for (const group of recurringBillGroups) {
      const existing = counts.get(group.categoryId) ?? empty();
      counts.set(group.categoryId, {
        ...existing,
        recurringBills: group._count._all,
      });
    }
    return counts;
  }
}
