import { prisma } from "@/core/database/prisma.client";
import type { Prisma } from "@prisma/client";
import type { CategoryRepository } from "../domain/category.repository";
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
}
