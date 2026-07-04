import { prisma } from "@/core/database/prisma.client";
import type {
  SupplierRepository,
  CreateSupplierInput,
} from "../domain/supplier.repository";
import type { Supplier } from "../domain/supplier.entity";

export class PrismaSupplierRepository implements SupplierRepository {
  async listActive(organizationId: string): Promise<Supplier[]> {
    return prisma.supplier.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
    });
  }

  async create(data: CreateSupplierInput): Promise<Supplier> {
    return prisma.supplier.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        document: data.document,
      },
    });
  }
}
