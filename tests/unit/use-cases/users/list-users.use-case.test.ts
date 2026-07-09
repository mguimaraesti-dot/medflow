import { describe, it, expect, vi } from "vitest";
import { listUsersUseCase } from "@/features/users/application/list-users.use-case";
import type { UserManagementRepository } from "@/features/users/domain/user-management.repository";

describe("listUsersUseCase", () => {
  it("repassa organizationId, filtros e paginação para o repositório", async () => {
    const result = {
      items: [],
      page: 2,
      pageSize: 20,
      total: 0,
      totalPages: 1,
    };
    const list = vi.fn().mockResolvedValue(result);
    const userManagementRepository = {
      list,
    } as unknown as UserManagementRepository;

    const output = await listUsersUseCase(
      {
        status: "ACTIVE",
        roleId: "role-1",
        search: "ana",
        page: 2,
        pageSize: 20,
      },
      "org-1",
      { userManagementRepository },
    );

    expect(list).toHaveBeenCalledWith(
      {
        organizationId: "org-1",
        status: "ACTIVE",
        roleId: "role-1",
        search: "ana",
      },
      { page: 2, pageSize: 20 },
    );
    expect(output).toBe(result);
  });
});
