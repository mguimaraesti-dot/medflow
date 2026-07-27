import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncRelatorioAccessForUser } from "@/core/integrations/relatorio-exames-sync";

const findUniqueUser = vi.fn();
const loggerError = vi.fn();
const loggerInfo = vi.fn();

vi.mock("@/core/database/prisma.client", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueUser(...args) },
  },
}));

vi.mock("@/core/logger/logger", () => ({
  logger: {
    error: (...args: unknown[]) => loggerError(...args),
    info: (...args: unknown[]) => loggerInfo(...args),
  },
}));

function buildSupabaseAdmin(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({
          data: { user: { app_metadata: {} } },
          error: null,
        }),
        updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        ...overrides,
      },
    },
  };
}

describe("syncRelatorioAccessForUser", () => {
  beforeEach(() => {
    findUniqueUser.mockReset();
    loggerError.mockReset();
    loggerInfo.mockReset();
  });

  it("não faz nada (nem lança) quando o usuário não existe mais", async () => {
    findUniqueUser.mockResolvedValueOnce(null);
    const supabaseAdmin = buildSupabaseAdmin();

    await expect(
      syncRelatorioAccessForUser("user-1", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: supabaseAdmin as any,
      }),
    ).resolves.toBeUndefined();

    expect(supabaseAdmin.auth.admin.getUserById).not.toHaveBeenCalled();
  });

  it("grava relatorioPerfil='gestor' para ADMIN/OWNER ativos (tem USERS_MANAGE)", async () => {
    findUniqueUser.mockResolvedValueOnce({
      supabaseAuthId: "auth-1",
      status: "ACTIVE",
      role: {
        permissions: [{ key: "dashboard:read" }, { key: "users:manage" }],
      },
    });
    const supabaseAdmin = buildSupabaseAdmin();

    await syncRelatorioAccessForUser("user-1", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdmin: supabaseAdmin as any,
    });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      "auth-1",
      { app_metadata: { relatorioPerfil: "gestor" } },
    );
  });

  it("grava relatorioPerfil=null para usuário INACTIVE, mesmo que o papel desse acesso", async () => {
    findUniqueUser.mockResolvedValueOnce({
      supabaseAuthId: "auth-2",
      status: "INACTIVE",
      role: {
        permissions: [{ key: "dashboard:read" }, { key: "users:manage" }],
      },
    });
    const supabaseAdmin = buildSupabaseAdmin();

    await syncRelatorioAccessForUser("user-2", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdmin: supabaseAdmin as any,
    });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      "auth-2",
      { app_metadata: { relatorioPerfil: null } },
    );
  });

  it("preserva outras chaves já existentes em app_metadata ao gravar", async () => {
    findUniqueUser.mockResolvedValueOnce({
      supabaseAuthId: "auth-3",
      status: "ACTIVE",
      role: { permissions: [{ key: "dashboard:read" }] },
    });
    const supabaseAdmin = buildSupabaseAdmin({
      getUserById: vi.fn().mockResolvedValue({
        data: { user: { app_metadata: { outraCoisa: "valor" } } },
        error: null,
      }),
    });

    await syncRelatorioAccessForUser("user-3", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdmin: supabaseAdmin as any,
    });

    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      "auth-3",
      { app_metadata: { outraCoisa: "valor", relatorioPerfil: "leitor" } },
    );
  });

  it("nunca lança quando a Admin API falha ao ler o usuário — só loga", async () => {
    findUniqueUser.mockResolvedValueOnce({
      supabaseAuthId: "auth-4",
      status: "ACTIVE",
      role: { permissions: [{ key: "dashboard:read" }] },
    });
    const supabaseAdmin = buildSupabaseAdmin({
      getUserById: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "boom" },
      }),
    });

    await expect(
      syncRelatorioAccessForUser("user-4", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: supabaseAdmin as any,
      }),
    ).resolves.toBeUndefined();

    expect(supabaseAdmin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(loggerError).toHaveBeenCalled();
  });

  it("nunca lança quando a gravação falha — só loga", async () => {
    findUniqueUser.mockResolvedValueOnce({
      supabaseAuthId: "auth-5",
      status: "ACTIVE",
      role: { permissions: [{ key: "dashboard:read" }] },
    });
    const supabaseAdmin = buildSupabaseAdmin({
      updateUserById: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    await expect(
      syncRelatorioAccessForUser("user-5", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: supabaseAdmin as any,
      }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });

  it("nunca lança quando o próprio prisma lança um erro inesperado", async () => {
    findUniqueUser.mockRejectedValueOnce(new Error("conexão perdida"));
    const supabaseAdmin = buildSupabaseAdmin();

    await expect(
      syncRelatorioAccessForUser("user-6", {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabaseAdmin: supabaseAdmin as any,
      }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalled();
  });
});
