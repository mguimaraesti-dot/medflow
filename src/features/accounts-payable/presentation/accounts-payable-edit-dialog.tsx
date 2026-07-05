"use client";

import { Copy, Construction } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { STATUS_META } from "./accounts-payable-helpers";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

/**
 * Ainda não existe caso de uso de atualização de `AccountsPayable` no backend
 * (só create/pay/cancel) — alterar isso é fora do escopo desta iteração de
 * UX. Este modal cobre a interação prevista (botão "Editar conta" visível,
 * abre um Modal, nunca uma página nova) sem fingir uma edição que ainda não
 * existe: mostra os dados atuais e direciona para "Duplicar" enquanto a
 * atualização real não é implementada.
 */
export function AccountsPayableEditDialog({
  payable,
  supplierName,
  categoryName,
  open,
  onOpenChange,
  onDuplicate,
}: {
  payable: AccountsPayableResponseDTO | null;
  supplierName?: string;
  categoryName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicate: (payable: AccountsPayableResponseDTO) => void;
}) {
  const badge = payable ? STATUS_META[payable.displayStatus] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar conta</DialogTitle>
          <DialogDescription>
            Alteração de conta já cadastrada ainda não está disponível — chega
            numa próxima etapa (requer um caso de uso de atualização no
            backend).
          </DialogDescription>
        </DialogHeader>

        {payable && (
          <div className="bg-muted/40 grid grid-cols-2 gap-4 rounded-lg border p-4">
            <Field label="Fornecedor" value={supplierName ?? "—"} />
            <Field label="Categoria" value={categoryName ?? "—"} />
            <Field label="Valor" value={formatCurrencyBRL(payable.amount)} />
            <Field
              label="Vencimento"
              value={formatDateOnlyBR(payable.dueDate)}
            />
            <Field
              label="Status"
              value={
                badge && (
                  <Badge variant="outline" className={badge.badgeClassName}>
                    {badge.label}
                  </Badge>
                )
              }
            />
          </div>
        )}

        <div className="text-muted-foreground flex items-start gap-2 text-xs">
          <Construction className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Por enquanto, use &quot;Duplicar&quot; para criar uma nova conta com
          estes mesmos dados.
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => payable && onDuplicate(payable)}
          >
            <Copy className="h-4 w-4" />
            Duplicar conta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
