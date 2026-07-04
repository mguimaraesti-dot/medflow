import { describe, it, expect } from "vitest";
import {
  ROLE_PERMISSIONS,
  PERMISSIONS,
} from "@/core/permissions/roles-permissions";

describe("ROLE_PERMISSIONS", () => {
  // Cenário da matriz: "Reabertura -> Apenas Admin com justificativa" (parte do "apenas Admin")
  it("só ADMIN tem permissão para reabrir o caixa", () => {
    const rolesWithReopen = Object.entries(ROLE_PERMISSIONS)
      .filter(([, perms]) => perms.includes(PERMISSIONS.CASH_REGISTER_REOPEN))
      .map(([role]) => role);

    expect(rolesWithReopen).toEqual(["ADMIN"]);
  });

  it("Secretária não pode confirmar pagamento, nem fechar ou estornar caixa", () => {
    const secretaryPerms = ROLE_PERMISSIONS.SECRETARY;

    expect(secretaryPerms).not.toContain(PERMISSIONS.CASH_FLOW_REVERSE);
    expect(secretaryPerms).not.toContain(PERMISSIONS.CASH_REGISTER_CLOSE);
    expect(secretaryPerms).not.toContain(PERMISSIONS.PAYABLE_PAY);
  });

  it("Secretária pode abrir caixa e lançar movimentações", () => {
    const secretaryPerms = ROLE_PERMISSIONS.SECRETARY;

    expect(secretaryPerms).toContain(PERMISSIONS.CASH_REGISTER_OPEN);
    expect(secretaryPerms).toContain(PERMISSIONS.CASH_FLOW_CREATE);
  });

  it("Financeiro e Proprietário podem fechar e estornar caixa", () => {
    for (const role of ["FINANCE", "OWNER"] as const) {
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.CASH_REGISTER_CLOSE);
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.CASH_FLOW_REVERSE);
    }
  });

  // Motor de Tesouraria (docs/decisions/adr-tesouraria.md, Seção 5, Q4): só Admin.
  it("só ADMIN tem permissão de ajuste manual do Cofre", () => {
    const rolesWithManualAdjustment = Object.entries(ROLE_PERMISSIONS)
      .filter(([, perms]) =>
        perms.includes(PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT),
      )
      .map(([role]) => role);

    expect(rolesWithManualAdjustment).toEqual(["ADMIN"]);
  });

  it("ADMIN, OWNER e FINANCE podem confirmar handoff e rejeitar conferência", () => {
    for (const role of ["ADMIN", "OWNER", "FINANCE"] as const) {
      expect(ROLE_PERMISSIONS[role]).toContain(
        PERMISSIONS.TREASURY_CONFIRM_HANDOFF,
      );
      expect(ROLE_PERMISSIONS[role]).toContain(
        PERMISSIONS.TREASURY_REJECT_CONFERENCE,
      );
    }
  });

  it("ADMIN, OWNER e FINANCE podem solicitar sangria, mas não Secretária nem Contador", () => {
    for (const role of ["ADMIN", "OWNER", "FINANCE"] as const) {
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.TREASURY_SANGRIA);
    }
    for (const role of ["SECRETARY", "ACCOUNTANT"] as const) {
      expect(ROLE_PERMISSIONS[role]).not.toContain(
        PERMISSIONS.TREASURY_SANGRIA,
      );
    }
  });

  it("Secretária e Contador não têm nenhuma permissão de tesouraria", () => {
    const treasuryPermissions = [
      PERMISSIONS.TREASURY_CONFIRM_HANDOFF,
      PERMISSIONS.TREASURY_REJECT_CONFERENCE,
      PERMISSIONS.TREASURY_SANGRIA,
      PERMISSIONS.TREASURY_MANUAL_ADJUSTMENT,
    ];

    for (const role of ["SECRETARY", "ACCOUNTANT"] as const) {
      for (const permission of treasuryPermissions) {
        expect(ROLE_PERMISSIONS[role]).not.toContain(permission);
      }
    }
  });
});
