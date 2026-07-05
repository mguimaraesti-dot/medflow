import { prisma } from "@/core/database/prisma.client";
import type { Prisma } from "@prisma/client";
import type {
  CategoryRepository,
  CreateCategoryInput,
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
}
