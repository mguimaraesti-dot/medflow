import { prisma } from "@/core/database/prisma.client";
import type {
  RecurringBillRepository,
  CreateRecurringBillInput,
} from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";

export class PrismaRecurringBillRepository implements RecurringBillRepository {
  async findById(id: string): Promise<RecurringBill | null> {
    return prisma.recurringBill.findUnique({ where: { id } });
  }

  async create(data: CreateRecurringBillInput): Promise<RecurringBill> {
    return prisma.recurringBill.create({
      data: {
        organizationId: data.organizationId,
        supplierId: data.supplierId,
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        dueDay: data.dueDay,
        periodicity: data.periodicity,
        maxOccurrences: data.maxOccurrences,
        firstDueDate: data.firstDueDate,
      },
    });
  }

  async deactivate(id: string): Promise<RecurringBill> {
    return prisma.recurringBill.update({
      where: { id },
      data: { active: false },
    });
  }
}
