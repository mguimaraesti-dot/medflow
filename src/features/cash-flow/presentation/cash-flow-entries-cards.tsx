"use client";

import { formatCurrencyBRL, formatTimeBR } from "@/shared/lib/format";
import { getPaymentMethodIcon } from "@/shared/lib/lucide-icon-map";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { patientOrReason } from "./cash-flow-entries-table";
import type { Category } from "@/features/categories/domain/category.entity";
import type { PaymentMethod } from "@/features/payment-methods/domain/payment-method.entity";
import type { CashFlowEntryResponseDTO } from "../application/dtos/cash-flow-entry.response-dto";

/**
 * Lista mobile de Lançamentos — card em vez da tabela (que cortaria
 * colunas no mobile mesmo com o `overflow-x-auto` próprio). Toque no
 * card abre o mesmo `CashFlowEntryDetailDrawer` de sempre (com o
 * "Estornar" lá dentro) — sem botão de ação solto no card.
 */
export function CashFlowEntriesCards({
  entries,
  paymentMethodById,
  categoryById,
  onSelect,
}: {
  entries: CashFlowEntryResponseDTO[];
  paymentMethodById: Map<string, PaymentMethod>;
  categoryById: Map<string, Category>;
  onSelect: (entry: CashFlowEntryResponseDTO) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const paymentMethod = paymentMethodById.get(entry.paymentMethodId);
        const PaymentMethodIcon = getPaymentMethodIcon(
          paymentMethod?.name ?? "",
        );
        const category = categoryById.get(entry.categoryId);
        const isIn = entry.type === "IN";

        return (
          <div
            key={entry.id}
            className={cn(
              "bg-card cursor-pointer rounded-xl border-l-4 p-3.5 shadow-sm",
              isIn ? "border-l-green-500" : "border-l-destructive",
            )}
            onClick={() => onSelect(entry)}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground text-xs">
                {formatTimeBR(entry.occurredAt)}
              </span>
              <span
                className={cn(
                  "text-base font-semibold",
                  isIn
                    ? "text-green-600 dark:text-green-500"
                    : "text-destructive",
                )}
              >
                {isIn ? "+" : "-"}
                {formatCurrencyBRL(entry.amount)}
              </span>
            </div>

            <p className="mt-1 truncate text-sm font-medium">
              {patientOrReason(entry)}
            </p>

            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color ?? "#64748B" }}
                />
                {category?.name ?? "—"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <PaymentMethodIcon className="h-3 w-3" />
                {paymentMethod?.name ?? "—"}
              </span>
              {entry.isReversed && <Badge variant="secondary">Estornado</Badge>}
              {entry.reversalOfEntryId && (
                <Badge variant="outline">Estorno</Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
