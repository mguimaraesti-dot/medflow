import { describe, it, expect, vi } from "vitest";
import { createUserUseCase } from "@/features/users/application/create-user.use-case";
import {
  NotFoundError,
  UserEmailAlreadyExistsError,
} from "@/core/errors/domain-error";
import type { UserManagementRepository } from "@/features/users/domain/user-management.repository";

const findUniqueUser = vi.fn();
const findUniqueRole = vi.fn();
const auditLogCreate = vi.fn();

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) },
    role: { findUnique: (...args: unknown[]) => findUniqueRole(...args) },
    auditLog: { create: (...args: unknown[]) => auditLogCreate(...args) },
  },
}));

function buildSupabaseAdmin(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      admin: {
        inviteUserByEmail: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "auth-1" } }, error: null }),
        ...overrides,
      },
    },
  };
}

describe("createUserUseCase", () => {
  it("bloqueia quando o e-mail já está cadastrado", async () => {
    findUniqueUser.mockResolvedValueOnce({ id: "user-existing" });
    const userManagementRepository = {} as UserManagementRepository;

    await expect(
      createUserUseCase(
        { name: "Ana", email: "ana@medflow.com", roleId: "role-1" },
        "admin-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: buildSupabaseAdmin() as any,
          appOrigin: "https://medflow-finance.vercel.app",
        },
      ),
    ).rejects.toThrow(UserEmailAlreadyExistsError);
  });

  it("bloqueia quando o perfil informado não existe", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    findUniqueRole.mockResolvedValueOnce(null);
    const userManagementRepository = {} as UserManagementRepository;

    await expect(
      createUserUseCase(
        { name: "Ana", email: "ana@medflow.com", roleId: "role-x" },
        "admin-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: buildSupabaseAdmin() as any,
          appOrigin: "https://medflow-finance.vercel.app",
        },
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("convida o usuário e finaliza o convite com nome/perfil/organização", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    findUniqueRole.mockResolvedValueOnce({ id: "role-1", name: "SECRETARY" });
    const finalizeInvite = vi.fn().mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@medflow.com",
      roleName: "SECRETARY",
    });
    const userManagementRepository = {
      finalizeInvite,
    } as unknown as UserManagementRepository;
    const supabaseAdmin = buildSupabaseAdmin();

    const result = await createUserUseCase(
      { name: "Ana", email: "ana@medflow.com", roleId: "role-1" },
      "admin-1",
      "org-1",
      {
        userManagementRepository,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: supabaseAdmin as any,
        appOrigin: "https://medflow-finance.vercel.app",
      },
    );

    expect(supabaseAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "ana@medflow.com",
      { redirectTo: "https://medflow-finance.vercel.app/reset-password" },
    );
    expect(finalizeInvite).toHaveBeenCalledWith("auth-1", {
      name: "Ana",
      roleId: "role-1",
      organizationId: "org-1",
    });
    expect(result.id).toBe("user-1");
  });

  it("propaga erro quando o convite falha no Supabase Auth", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    findUniqueRole.mockResolvedValueOnce({ id: "role-1", name: "SECRETARY" });
    const userManagementRepository = {
      finalizeInvite: vi.fn(),
    } as unknown as UserManagementRepository;
    const supabaseAdmin = buildSupabaseAdmin({
      inviteUserByEmail: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "boom" },
      }),
    });

    await expect(
      createUserUseCase(
        { name: "Ana", email: "ana@medflow.com", roleId: "role-1" },
        "admin-1",
        "org-1",
        {
          userManagementRepository,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabaseAdmin: supabaseAdmin as any,
          appOrigin: "https://medflow-finance.vercel.app",
        },
      ),
    ).rejects.toThrow("Falha ao convidar usuário");
  });
});
