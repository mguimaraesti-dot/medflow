import { describe, it, expect, vi } from "vitest";
import { setUserStatusUseCase } from "@/features/users/application/set-user-status.use-case";
import {
  NotFoundError,
  CannotModifyOwnRoleError,
  LastActiveAdminError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "@/features/users/domain/user-management.repository";

const auditLogCreate = vi.fn();
const findUniqueUser = vi.fn();

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
    user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) },
  },
}));

// `syncRelatorioAccessForUser` nunca lança — sem usuário encontrado,
// ela só faz nada. Não é o foco destes testes (que cobrem as regras de
// `setUserStatusUseCase`), então o mock devolve `null` por padrão.
findUniqueUser.mockResolvedValue(null);

function buildSupabaseAdmin() {
  return { auth: { admin: {} } };
}

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

describe("setUserStatusUseCase", () => {
  it("bloqueia quando o usuário não existe ou é de outra organização", async () => {
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as UserManagementRepository;

    await expect(
      setUserStatusUseCase(
        "user-1",
        { status: "INACTIVE" },
        "actor-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: buildSupabaseAdmin() as any,
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("bloqueia o usuário desativar/reativar a si mesmo", async () => {
    const target = buildUser({ id: "actor-1" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
    } as unknown as UserManagementRepository;

    await expect(
      setUserStatusUseCase(
        "actor-1",
        { status: "INACTIVE" },
        "actor-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: buildSupabaseAdmin() as any,
        },
      ),
    ).rejects.toThrow(CannotModifyOwnRoleError);
  });

  it("bloqueia desativar o último Admin ativo", async () => {
    const target = buildUser({ roleName: "ADMIN", status: "ACTIVE" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins: vi.fn().mockResolvedValue(0),
    } as unknown as UserManagementRepository;

    await expect(
      setUserStatusUseCase(
        "user-1",
        { status: "INACTIVE" },
        "actor-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: buildSupabaseAdmin() as any,
        },
      ),
    ).rejects.toThrow(LastActiveAdminError);
  });

  it("desativa normalmente quando sobra outro Admin ativo", async () => {
    const target = buildUser({ roleName: "ADMIN", status: "ACTIVE" });
    const setStatus = vi
      .fn()
      .mockResolvedValue({ ...target, status: "INACTIVE" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins: vi.fn().mockResolvedValue(1),
      setStatus,
    } as unknown as UserManagementRepository;

    const result = await setUserStatusUseCase(
      "user-1",
      { status: "INACTIVE" },
      "actor-1",
      "org-1",
      {
        userManagementRepository,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: buildSupabaseAdmin() as any,
      },
    );

    expect(setStatus).toHaveBeenCalledWith("user-1", "INACTIVE");
    expect(result.status).toBe("INACTIVE");
  });

  it("reativa sem checar último Admin (só importa ao desativar)", async () => {
    const target = buildUser({
      roleName: "ADMIN",
      status: "INACTIVE",
    });
    const countActiveAdmins = vi.fn();
    const setStatus = vi
      .fn()
      .mockResolvedValue({ ...target, status: "ACTIVE" });
    const userManagementRepository = {
      findById: vi.fn().mockResolvedValue(target),
      countActiveAdmins,
      setStatus,
    } as unknown as UserManagementRepository;

    await setUserStatusUseCase(
      "user-1",
      { status: "ACTIVE" },
      "actor-1",
      "org-1",
      {
        userManagementRepository,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: buildSupabaseAdmin() as any,
      },
    );

    expect(countActiveAdmins).not.toHaveBeenCalled();
  });
});
