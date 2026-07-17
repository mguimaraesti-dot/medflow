"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Repeat,
} from "lucide-react";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { useAccountsPayable } from "./use-accounts-payable";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { AccountsPayableRecurrenceScopeDialog } from "./accounts-payable-recurrence-scope-dialog";
import { DeleteAccountsPayableDialog } from "./delete-accounts-payable-dialog";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { AccountsPayableRowMenu } from "./accounts-payable-row-menu";
import {
  CATEGORY_COLOR_OVERRIDES,
  getDueDateDisplay,
} from "./accounts-payable-helpers";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { toast } from "sonner";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";
import type { StatusFilter } from "./accounts-payable-table";

const DUE_DATE_TONE_CLASS: Record<string, string> = {
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  default: "text-foreground",
};

const CARD_TONE_BORDER: Record<string, string> = {
  danger: "border-l-4 border-l-destructive",
  warning: "border-l-4 border-l-amber-500",
  default: "",
};

/**
 * Lista em cards da tela de Contas a Pagar no mobile — substitui a
 * `AccountsPayableTable` abaixo de `lg` (ver `useMediaQuery` em
 * `accounts-payable-screen.tsx`). Reaproveita `AccountsPayableRowMenu`
 * pro "⋯" (mesma lógica de ações por status da tabela desktop).
 */
export function AccountsPayableCards({
  canPay,
  canCreate,
  canDelete,
  status,
  categoryId,
  supplierId,
  recurringOnly,
  search,
  dueDateFrom,
  dueDateTo,
  pendingReminderOnly,
  onView,
  onEdit,
  onDuplicate,
  onCreateNew,
}: {
  canPay: boolean;
  canCreate: boolean;
  canDelete: boolean;
  status: StatusFilter;
  categoryId?: string;
  supplierId?: string;
  recurringOnly?: "RECURRING" | "NON_RECURRING";
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  pendingReminderOnly?: boolean;
  onView: (
    payable: AccountsPayableResponseDTO,
    tab?: "account" | "history" | "attachments",
  ) => void;
  onEdit: (payable: AccountsPayableResponseDTO) => void;
  onDuplicate: (payable: AccountsPayableResponseDTO) => void;
  onCreateNew: () => void;
}) {
  const [page, setPage] = useState(1);
  const [payingTarget, setPayingTarget] =
    useState<AccountsPayableResponseDTO | null>(null);
  const [cancelScopeTarget, setCancelScopeTarget] =
    useState<AccountsPayableResponseDTO | null>(null);
  const [cancelPaymentTarget, setCancelPaymentTarget] =
    useState<AccountsPayableResponseDTO | null>(null);
  const [deletingTarget, setDeletingTarget] =
    useState<AccountsPayableResponseDTO | null>(null);

  const { data, isLoading } = useAccountsPayable({
    status: status === "ALL" ? undefined : status,
    categoryId,
    supplierId,
    recurringOnly,
    search,
    dueDateFrom,
    dueDateTo,
    pendingReminderOnly,
    page,
    pageSize: 20,
  });
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const cancelAccountsPayable = useCancelAccountsPayable();

  const supplierById = new Map(suppliers?.map((s) => [s.id, s]));
  const categoryById = new Map(categories?.map((c) => [c.id, c]));

  async function handleCancel(
    id: string,
    scope: "SINGLE" | "SERIES" = "SINGLE",
  ) {
    try {
      await cancelAccountsPayable.mutateAsync({ accountsPayableId: id, scope });
      toast.success(
        scope === "SERIES" ? "Recorrência encerrada." : "Conta cancelada.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar.",
      );
    }
  }

  return (
    <>
      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="Nenhuma conta encontrada."
          description="As contas a pagar cadastradas aparecem aqui."
          action={
            canCreate && (
              <Button type="button" size="sm" onClick={onCreateNew}>
                Nova Conta
              </Button>
            )
          }
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {data.items.map((payable) => {
              const category = categoryById.get(payable.categoryId);
              const dueDateDisplay = getDueDateDisplay(
                payable.dueDate,
                payable.status,
              );
              const canPayThis =
                canPay &&
                (payable.displayStatus === "PENDING" ||
                  payable.displayStatus === "OVERDUE");
              const canCancelThis = Boolean(
                canPay &&
                ((payable.status === "PENDING" && payable.recurringBillId) ||
                  payable.status === "PAID"),
              );

              return (
                <div
                  key={payable.id}
                  className={cn(
                    "bg-card cursor-pointer rounded-xl border p-3.5 shadow-sm",
                    CARD_TONE_BORDER[dueDateDisplay.tone],
                  )}
                  onClick={() => onView(payable)}
                >
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          DUE_DATE_TONE_CLASS[dueDateDisplay.tone],
                        )}
                      >
                        {dueDateDisplay.top}
                      </p>
                      {dueDateDisplay.bottom && (
                        <p className="text-muted-foreground text-xs">
                          {dueDateDisplay.bottom}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold tabular-nums">
                      {formatCurrencyBRL(payable.amount)}
                    </p>
                  </div>

                  <p className="mb-1 truncate text-[15px] font-medium">
                    {supplierById.get(payable.supplierId)?.name ?? "—"}
                  </p>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
                    {category && (
                      <Badge
                        variant="outline"
                        className={CATEGORY_COLOR_OVERRIDES[category.name]}
                        style={
                          CATEGORY_COLOR_OVERRIDES[category.name]
                            ? undefined
                            : {
                                borderColor: category.color,
                                color: category.color,
                              }
                        }
                      >
                        {category.name}
                      </Badge>
                    )}
                    {payable.recurringBillId && (
                      <Badge
                        variant="outline"
                        className="border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                      >
                        <Repeat className="h-3 w-3" />
                        Recorrente
                      </Badge>
                    )}
                    {/* Sem hover no mobile — só mostra o lembrete quando
                        há algo a fazer (PENDING_SEND) ou já resolvido
                        (SENT). NOT_DUE/NOT_APPLICABLE ficam de fora de
                        propósito: não acrescentam informação útil num
                        card já compacto. */}
                    {payable.reminderStatus === "PENDING_SEND" && (
                      <Badge className="border-transparent bg-amber-500 text-white">
                        <WhatsAppIcon className="h-3 w-3" />
                        Enviar lembrete
                      </Badge>
                    )}
                    {payable.reminderStatus === "SENT" && (
                      <span className="text-success inline-flex items-center gap-1">
                        <WhatsAppIcon className="h-3 w-3" />
                        Lembrete enviado
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-3 flex items-center justify-end gap-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {canPayThis ? (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setPayingTarget(payable)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Pagar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onView(payable)}
                      >
                        Ver
                      </Button>
                    )}
                    <AccountsPayableRowMenu
                      payable={payable}
                      canCreate={canCreate}
                      canDelete={canDelete}
                      canCancelThis={canCancelThis}
                      onView={() => onView(payable)}
                      onEdit={() => onEdit(payable)}
                      onDuplicate={() => onDuplicate(payable)}
                      onCancelScope={() => setCancelScopeTarget(payable)}
                      onCancelPayment={() => setCancelPaymentTarget(payable)}
                      onDelete={() => setDeletingTarget(payable)}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <PayAccountsPayableDialog
        payable={payingTarget}
        open={payingTarget !== null}
        onOpenChange={(open) => !open && setPayingTarget(null)}
      />

      <AccountsPayableRecurrenceScopeDialog
        open={cancelScopeTarget !== null}
        onOpenChange={(open) => !open && setCancelScopeTarget(null)}
        title="Esta conta pertence a uma recorrência"
        description="Como deseja cancelar?"
        singleLabel="Apenas esta conta"
        seriesLabel="Encerrar recorrência"
        confirmLabel="Confirmar"
        isPending={cancelAccountsPayable.isPending}
        onConfirm={async (scope) => {
          if (!cancelScopeTarget) return;
          await handleCancel(cancelScopeTarget.id, scope);
          setCancelScopeTarget(null);
        }}
      />

      <ConfirmDialog
        open={cancelPaymentTarget !== null}
        onOpenChange={(open) => !open && setCancelPaymentTarget(null)}
        title="Cancelar pagamento"
        cancelLabel="Voltar"
        confirmLabel="Cancelar pagamento"
        pendingLabel="Cancelando..."
        isPending={cancelAccountsPayable.isPending}
        onConfirm={async () => {
          if (!cancelPaymentTarget) return;
          await handleCancel(cancelPaymentTarget.id);
          setCancelPaymentTarget(null);
        }}
      />

      <DeleteAccountsPayableDialog
        payable={deletingTarget}
        open={deletingTarget !== null}
        onOpenChange={(open) => !open && setDeletingTarget(null)}
      />
    </>
  );
}
