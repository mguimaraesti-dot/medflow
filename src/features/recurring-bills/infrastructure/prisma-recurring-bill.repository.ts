import { prisma } from "@/core/database/prisma.client";
import type {
  RecurringBillRepository,
  CreateRecurringBillInput,
} from "../domain/recurring-bill.repository";
import type { RecurringBill } from "../domain/recurring-bill.entity";

export class PrismaRecurringBillRepository implements RecurringBillRepository {
  async listActive(organizationId: string): Promise<RecurringBill[]> {
    return prisma.recurringBill.findMany({
      where: { organizationId, active: true },
      orderBy: { dueDay: "asc" },
    });
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
