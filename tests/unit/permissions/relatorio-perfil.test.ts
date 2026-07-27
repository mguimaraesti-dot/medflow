import { describe, it, expect } from "vitest";
import { mapRoleToRelatorioPerfil } from "@/core/permissions/relatorio-perfil";
import { PERMISSIONS } from "@/core/permissions/roles-permissions";

describe("mapRoleToRelatorioPerfil", () => {
  it("nega quando não tem DASHBOARD_READ (Secretária) — nunca 'leitor' por padrão", () => {
    expect(
      mapRoleToRelatorioPerfil([
        PERMISSIONS.CASH_FLOW_CREATE,
        PERMISSIONS.CASH_REGISTER_OPEN,
      ]),
    ).toBeNull();
  });

  it("nega lista de permissões vazia", () => {
    expect(mapRoleToRelatorioPerfil([])).toBeNull();
  });

  it("mapeia para 'gestor' quem administra usuários (ADMIN/OWNER)", () => {
    expect(
      mapRoleToRelatorioPerfil([
        PERMISSIONS.DASHBOARD_READ,
        PERMISSIONS.USERS_MANAGE,
      ]),
    ).toBe("gestor");
  });

  it("mapeia para 'leitor' quem só lê (Financeiro/Contador/Diretor)", () => {
    expect(mapRoleToRelatorioPerfil([PERMISSIONS.DASHBOARD_READ])).toBe(
      "leitor",
    );
  });
});
