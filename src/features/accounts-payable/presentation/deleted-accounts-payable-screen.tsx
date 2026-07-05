"use client";

import { useState } from "react";
import { DeletedAccountsPayableTable } from "./deleted-accounts-payable-table";
import { AccountsPayableDrawer } from "./accounts-payable-drawer";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/** Tela exclusiva de Administrador — nunca permite editar, só visualizar e restaurar. */
export function DeletedAccountsPayableScreen() {
  const [viewing, setViewing] = useState<AccountsPayableResponseDTO | null>(
    null,
  );
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Contas Excluídas
        </h1>
        <p className="text-muted-foreground text-sm">
          Contas removidas da listagem principal (soft delete) — permanecem aqui
          para auditoria e podem ser restauradas.
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <DeletedAccountsPayableTable onView={setViewing} />
      </div>

      <AccountsPayableDrawer
        payable={viewing}
        supplierName={
          viewing
            ? (suppliers?.find((s) => s.id === viewing.supplierId)?.name ??
              undefined)
            : undefined
        }
        categoryName={
          viewing
            ? (categories?.find((c) => c.id === viewing.categoryId)?.name ??
              undefined)
            : undefined
        }
        canPay={false}
        canEdit={false}
        canDelete={false}
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </div>
  );
}
