import { describe, it, expect, vi } from "vitest";
import { updateUserUseCase } from "@/features/users/application/update-user.use-case";
import {
  NotFoundError,
  CannotModifyOwnRoleError,
  LastActiveAdminError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "@/features/users/domain/user-management.repository";

const auditLogCreate = vi.fn();

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
  },
}));

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    organizationId: "org-1",
    name: "Ana",
    email: "ana@medflow.com",
    roleId: "role-secretary",
    roleName: "SECRETARY",
    status: "ACTIVE",
    createdAt: new Date(),
    lastLoginAt: null,
    ...overrides,
  };
}

describe("updateUserUseCase", () => {
  it("bloqueia quando o usuário não existe ou é de outra organização", async () => {
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as UserManagementRepository;

    await expect(
      updateUserUseCase("user-1", { name: "Nova" }, "admin-1", "org-1", {
        userManagementRepository,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia autoedição do próprio perfil", async () => {
    const target = buildUser({ id: "admin-1" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
    } as unknown as UserManagementRepository;

    await expect(
      updateUserUseCase(
        "admin-1",
        { roleId: "role-owner" },
        "admin-1",
        "org-1",
        { userManagementRepository },
      ),
    ).rejects.toThrow(CannotModifyOwnRoleError);
  });

  it("permite autoedição do nome, sem mexer no perfil", async () => {
    const target = buildUser({ id: "admin-1" });
    const update = vi.fn().mockResolvedValue({ ...target, name: "Novo Nome" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      update,
    } as unknown as UserManagementRepository;

    const result = await updateUserUseCase(
      "admin-1",
      { name: "Novo Nome" },
      "admin-1",
      "org-1",
      { userManagementRepository },
    );

    expect(update).toHaveBeenCalledWith("admin-1", { name: "Novo Nome" });
    expect(result.name).toBe("Novo Nome");
  });

  it("bloqueia trocar o perfil do último Admin ativo", async () => {
    const target = buildUser({ roleName: "ADMIN", status: "ACTIVE" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins: vi.fn().mockResolvedValue(0),
    } as unknown as UserManagementRepository;

    await expect(
      updateUserUseCase(
        "user-1",
        { roleId: "role-owner" },
        "actor-1",
        "org-1",
        { userManagementRepository },
      ),
    ).rejects.toThrow(LastActiveAdminError);
  });

  it("permite trocar o perfil de um Admin ativo quando sobra outro Admin", async () => {
    const target = buildUser({ roleName: "ADMIN", status: "ACTIVE" });
    const update = vi.fn().mockResolvedValue({
      ...target,
      roleId: "role-owner",
      roleName: "OWNER",
    });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      update,
    } as unknown as UserManagementRepository;

    const result = await updateUserUseCase(
      "user-1",
      { roleId: "role-owner" },
      "actor-1",
      "org-1",
      { userManagementRepository },
    );

    expect(result.roleName).toBe("OWNER");
  });

  it("não checa último Admin quando o alvo já não é Admin ativo", async () => {
    const target = buildUser({ roleName: "SECRETARY", status: "ACTIVE" });
    const countActiveAdmins = vi.fn();
    const update = vi.fn().mockResolvedValue({
      ...target,
      roleId: "role-owner",
      roleName: "OWNER",
    });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins,
      update,
    } as unknown as UserManagementRepository;

    await updateUserUseCase(
      "user-1",
      { roleId: "role-owner" },
      "actor-1",
      "org-1",
      { userManagementRepository },
    );

    expect(countActiveAdmins).not.toHaveBeenCalled();
  });
});
