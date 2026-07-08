import { prisma } from "@/core/database/prisma.client";
import type {
  SupplierRepository,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierLinkedRecordsCount,
} from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";

export class PrismaSupplierRepository implements SupplierRepository {
  async list(organizationId: string): Promise<Supplier[]> {
    return prisma.supplier.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async findById(id: string): Promise<Supplier | null> {
    return prisma.supplier.findUnique({ where: { id } });
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    return prisma.supplier.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        personType: data.personType,
        document: data.document,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
      },
    });
  }

  async update(id: string, data: UpdateSupplierInput): Promise<Supplier> {
    return prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        personType: data.personType,
        document: data.document,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        notes: data.notes,
      },
    });
  }

  async setActive(id: string, active: boolean): Promise<Supplier> {
    return prisma.supplier.update({ where: { id }, data: { active } });
  }

  async delete(id: string): Promise<void> {
    await prisma.supplier.delete({ where: { id } });
  }

  async countLinkedRecords(id: string): Promise<SupplierLinkedRecordsCount> {
    const [accountsPayable, recurringBills] = await Promise.all([
      prisma.accountsPayable.count({ where: { supplierId: id } }),
      prisma.recurringBill.count({ where: { supplierId: id } }),
    ]);
    return { accountsPayable, recurringBills };
  }

  async countLinkedRecordsByOrganization(
    organizationId: string,
  ): Promise<Map<string, SupplierLinkedRecordsCount>> {
    const [accountsPayableGroups, recurringBillGroups] = await Promise.all([
      prisma.accountsPayable.groupBy({
        by: ["supplierId"],
        where: { organizationId },
        _count: { _all: true },
      }),
      prisma.recurringBill.groupBy({
        by: ["supplierId"],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);

    const counts = new Map<string, SupplierLinkedRecordsCount>();
    for (const group of accountsPayableGroups) {
      counts.set(group.supplierId, {
        accountsPayable: group._count._all,
        recurringBills: 0,
      });
    }
    for (const group of recurringBillGroups) {
      const existing = counts.get(group.supplierId) ?? {
        accountsPayable: 0,
        recurringBills: 0,
      };
      counts.set(group.supplierId, {
        ...existing,
        recurringBills: group._count._all,
      });
    }
    return counts;
  }
}
