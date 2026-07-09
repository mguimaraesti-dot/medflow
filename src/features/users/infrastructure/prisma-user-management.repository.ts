import { prisma } from "@/core/database/prisma.client";
import type { Prisma } from "@prisma/client";
import { buildPaginatedResult } from "@/shared/lib/pagination";
import type { Pagination, PaginatedResult } from "@/shared/lib/pagination";
import type {
  UserManagementRepository,
  ListUsersFilter,
  FinalizeInviteInput,
  UpdateManagedUserInput,
} from "../domain/user-management.repository";
import type {
  ManagedUser,
  ManagedUserStatus,
} from "../domain/managed-user.entity";

const ROLE_INCLUDE = { role: { select: { name: true } } } as const;

type RowWithRole = Prisma.UserGetPayload<{ include: typeof ROLE_INCLUDE }>;

function toDomain(row: RowWithRole): ManagedUser {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    email: row.email,
    roleId: row.roleId,
    roleName: row.role?.name ?? null,
    status: row.status,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
  };
}

export class PrismaUserManagementRepository implements UserManagementRepository {
  async list(
    filter: ListUsersFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ManagedUser>> {
    const where: Prisma.UserWhereInput = {
      organizationId: filter.organizationId,
      ...(filter.status && { status: filter.status }),
      ...(filter.roleId && { roleId: filter.roleId }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: "insensitive" } },
          { email: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: ROLE_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(rows.map(toDomain), total, pagination);
  }

  async findById(id: string): Promise<ManagedUser | null> {
    const row = await prisma.user.findUnique({
      where: { id },
      include: ROLE_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async finalizeInvite(
    supabaseAuthId: string,
    data: FinalizeInviteInput,
  ): Promise<ManagedUser> {
    const row = await prisma.user.update({
      where: { supabaseAuthId },
      data: {
        name: data.name,
        roleId: data.roleId,
        organizationId: data.organizationId,
        status: "ACTIVE",
      },
      include: ROLE_INCLUDE,
    });
    return toDomain(row);
  }

  async update(id: string, data: UpdateManagedUserInput): Promise<ManagedUser> {
    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.roleId !== undefined && { roleId: data.roleId }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: ROLE_INCLUDE,
    });
    return toDomain(row);
  }

  async setStatus(
    id: string,
    status: Extract<ManagedUserStatus, "ACTIVE" | "INACTIVE">,
  ): Promise<ManagedUser> {
    const row = await prisma.user.update({
      where: { id },
      data: { status },
      include: ROLE_INCLUDE,
    });
    return toDomain(row);
  }

  async countActiveAdmins(excludingUserId?: string): Promise<number> {
    return prisma.user.count({
      where: {
        status: "ACTIVE",
        role: { name: "ADMIN" },
        ...(excludingUserId && { id: { not: excludingUserId } }),
      },
    });
  }
}
