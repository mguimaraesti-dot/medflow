"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Badge } from "@/shared/ui/badge";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

const STATUS_BADGE: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  PENDING: { label: "Pendente", variant: "outline" },
  OVERDUE: { label: "Vencida", variant: "destructive" },
  PAID: { label: "Paga", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "secondary" },
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

/**
 * Só leitura, só a seção "Conta" (dados que já existem hoje). Histórico/
 * Auditoria/Anexos ficam de fora desta entrega — sem dado real ainda
 * (ver Contexto do plano do Design Pass).
 */
export function AccountsPayableDrawer({
  payable,
  supplierName,
  categoryName,
  open,
  onOpenChange,
}: {
  payable: AccountsPayableResponseDTO | null;
  supplierName?: string;
  categoryName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const badge = payable ? STATUS_BADGE[payable.displayStatus] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{payable?.description ?? "Conta a pagar"}</SheetTitle>
        </SheetHeader>

        {payable && (
          <div className="space-y-5 px-4 pb-4">
            <Field label="Fornecedor" value={supplierName ?? "—"} />
            <Field label="Categoria" value={categoryName ?? "—"} />
            <Field
              label="Valor"
              value={
                <span className="text-lg font-semibold">
                  {formatCurrencyBRL(payable.amount)}
                </span>
              }
            />
            <Field
              label="Status"
              value={
                badge && <Badge variant={badge.variant}>{badge.label}</Badge>
              }
            />
            <Field
              label="Vencimento"
              value={formatDateOnlyBR(payable.dueDate)}
            />
            <Field label="Descrição" value={payable.description || "—"} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
