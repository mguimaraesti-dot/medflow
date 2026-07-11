"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Eye,
  Pencil,
  Repeat,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { SendWhatsAppReminderButton } from "./send-whatsapp-reminder-button";
import { PayAccountsPayableDialog } from "./pay-accounts-payable-dialog";
import { DeleteAccountsPayableDialog } from "./delete-accounts-payable-dialog";
import { AccountsPayableRecurrenceScopeDialog } from "./accounts-payable-recurrence-scope-dialog";
import { EndRecurringBillDialog } from "./end-recurring-bill-dialog";
import { RecurringBillOccurrencesDrawer } from "./recurring-bill-occurrences-drawer";
import { AccountsPayableAttachmentsPanel } from "./accounts-payable-attachments-panel";
import {
  STATUS_META,
  getDueDateDisplay,
  getPaymentConfirmationDetail,
  getPaymentConfirmationDisplayName,
  getRecurrenceDisplay,
  shortMovementNumber,
  toAccountsPayableEvents,
} from "./accounts-payable-helpers";
import { useRecurringBill } from "./use-recurring-bill";
import { useRecurringBillInsights } from "./use-recurring-bill-insights";
import { useAccountsPayableAuditLog } from "./use-accounts-payable-audit-log";
import { useCancelAccountsPayable } from "./use-cancel-accounts-payable";
import { useSuppliers } from "@/features/suppliers/presentation/use-suppliers";
import { useCategories } from "@/features/categories/presentation/use-categories";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateTimeBR,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function AccountsPayableDrawer({
  payable,
  supplierName,
  categoryName,
  canPay = false,
  canEdit = false,
  canDelete = false,
  open,
  onOpenChange,
  onEdit,
  onOpenOccurrence,
  initialTab = "account",
}: {
  payable: AccountsPayableResponseDTO | null;
  supplierName?: string;
  categoryName?: string;
  canPay?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (payable: AccountsPayableResponseDTO) => void;
  onOpenOccurrence?: (payable: AccountsPayableResponseDTO) => void;
  /** Aba que abre por padrão (ex: clique no ícone de anexo abre direto em "attachments"). */
  initialTab?: "account" | "history" | "attachments";
}) {
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelScopeOpen, setCancelScopeOpen] = useState(false);
  const [cancelPaymentConfirmOpen, setCancelPaymentConfirmOpen] =
    useState(false);
  const [occurrencesDrawerOpen, setOccurrencesDrawerOpen] = useState(false);
  const [endRecurrenceOpen, setEndRecurrenceOpen] = useState(false);
  const cancelAccountsPayable = useCancelAccountsPayable();

  const { data: recurringBill } = useRecurringBill(
    payable?.recurringBillId ?? null,
  );
  const recurrenceDisplay =
    payable && recurringBill
      ? getRecurrenceDisplay(recurringBill, payable.occurrenceNumber)
      : null;
  const { data: insights } = useRecurringBillInsights(
    payable?.recurringBillId ?? null,
  );

  const { data: auditLog } = useAccountsPayableAuditLog(payable?.id ?? null);
  const { data: suppliers } = useSuppliers();
  const { data: categories } = useCategories();
  const supplierById = useMemo(
    () => new Map(suppliers?.map((s) => [s.id, s])),
    [suppliers],
  );
  const categoryById = useMemo(
    () => new Map(categories?.map((c) => [c.id, c])),
    [categories],
  );
  const events = auditLog
    ? toAccountsPayableEvents(auditLog, {
        supplierById,
        categoryById,
        isRecurring: payable?.recurringBillId != null,
      })
    : [];

  const badge = payable ? STATUS_META[payable.displayStatus] : null;
  const dueDateDisplay = payable
    ? getDueDateDisplay(payable.dueDate, payable.status)
    : null;
  const paymentConfirmation = payable
    ? getPaymentConfirmationDetail(payable)
    : null;
  const canPayThis =
    canPay &&
    payable !== null &&
    (payable.displayStatus === "PENDING" ||
      payable.displayStatus === "OVERDUE");
  // Conta paga ou cancelada é só consulta — editar/excluir nunca aparecem
  // fora do status PENDING (mesma regra do backend).
  const canEditThis =
    canEdit && payable !== null && payable.status === "PENDING";
  const canDeleteThis =
    canDelete && payable !== null && payable.status === "PENDING";
  // Mesma regra da tabela: Cancelar só existe pra conta PAGA (correção
  // pontual) ou PENDENTE de uma recorrência (única forma de "encerrar
  // recorrência"). Conta pendente avulsa usa Excluir, não Cancelar.
  const canCancelThis =
    canPay &&
    payable !== null &&
    ((payable.status === "PENDING" && Boolean(payable.recurringBillId)) ||
      payable.status === "PAID");

  async function handleCancel(scope: "SINGLE" | "SERIES" = "SINGLE") {
    if (!payable) return;
    try {
      await cancelAccountsPayable.mutateAsync({
        accountsPayableId: payable.id,
        scope,
      });
      toast.success(
        scope === "SERIES" ? "Recorrência encerrada." : "Conta cancelada.",
      );
      setCancelScopeOpen(false);
      setCancelPaymentConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cancelar.",
      );
    }
  }

  function onCancelClick() {
    if (payable?.status === "PENDING" && payable.recurringBillId) {
      setCancelScopeOpen(true);
    } else {
      setCancelPaymentConfirmOpen(true);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 sm:max-w-lg"
        >
          {payable && badge && dueDateDisplay && (
            <>
              <SheetHeader className="space-y-3 pb-2">
                <Badge
                  variant="outline"
                  className={cn("w-fit", badge.badgeClassName)}
                >
                  {badge.label}
                </Badge>
                <div>
                  <p className="text-muted-foreground text-xs">Conta a Pagar</p>
                  <SheetTitle className="text-xl">
                    {supplierName ?? payable.description}
                  </SheetTitle>
                </div>
                <p className="text-primary text-2xl font-semibold">
                  {formatCurrencyBRL(payable.amount)}
                </p>
                <p className="text-muted-foreground text-sm">
                  {payable.status === "PAID" || payable.status === "CANCELLED"
                    ? "Vencimento"
                    : dueDateDisplay.tone === "danger"
                      ? "Venceu"
                      : "Vence"}{" "}
                  {dueDateDisplay.top.toLowerCase()}
                  {dueDateDisplay.bottom && ` · ${dueDateDisplay.bottom}`}
                </p>
              </SheetHeader>

              <Tabs
                key={initialTab}
                defaultValue={initialTab}
                className="flex min-h-0 flex-1 flex-col"
              >
                <TabsList variant="line" className="mx-4">
                  <TabsTrigger value="account">Conta</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="attachments">Documentos</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  <TabsContent value="account" className="mt-4 space-y-4">
                    <p className="text-sm font-medium">
                      Informações principais
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Beneficiário" value={supplierName ?? "—"} />
                      <Field label="Categoria" value={categoryName ?? "—"} />
                      <Field
                        label="Vencimento"
                        value={
                          <span className="flex items-center gap-1.5">
                            {dueDateDisplay.bottom || dueDateDisplay.fullDate}
                            <span className="text-muted-foreground text-xs">
                              {dueDateDisplay.weekday}
                            </span>
                            {(dueDateDisplay.tone === "warning" ||
                              dueDateDisplay.tone === "danger") && (
                              <Badge
                                variant="outline"
                                className={
                                  dueDateDisplay.tone === "danger"
                                    ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                }
                              >
                                {dueDateDisplay.top}
                              </Badge>
                            )}
                          </span>
                        }
                      />
                      <Field
                        label="Confirmado por"
                        value={
                          paymentConfirmation ? (
                            <span
                              className="cursor-help"
                              title={paymentConfirmation.userName}
                            >
                              {getPaymentConfirmationDisplayName(
                                paymentConfirmation,
                              )}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <Field
                        label="Origem do Pagamento"
                        value={
                          payable.paymentOrigin === "COFRE"
                            ? "🟢 Cofre"
                            : "🏦 Banco"
                        }
                      />
                      <Field
                        label="Último lembrete de WhatsApp"
                        value={
                          payable.lastReminderSentAt
                            ? formatDateTimeBR(payable.lastReminderSentAt)
                            : "—"
                        }
                      />
                    </div>

                    {paymentConfirmation && (
                      <div className="space-y-2 rounded-lg border p-3">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                          Confirmado por{" "}
                          <span
                            className="cursor-help"
                            title={paymentConfirmation.userName}
                          >
                            {getPaymentConfirmationDisplayName(
                              paymentConfirmation,
                            )}
                          </span>
                        </p>
                        <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                          <span>Origem: {paymentConfirmation.source}</span>
                          <span>
                            Em:{" "}
                            {formatDateTimeBR(paymentConfirmation.confirmedAt)}
                          </span>
                          {payable.paidSafeMovementId && (
                            <span>
                              Nº movimentação:{" "}
                              {shortMovementNumber(payable.paidSafeMovementId)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {(payable.barcode || payable.pixKey) && (
                      <div className="space-y-3 rounded-lg border p-3">
                        <p className="text-sm font-medium">Pagamento</p>
                        {payable.barcode && (
                          <div className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                              <Field
                                label="Código de barras"
                                value={
                                  <span className="block truncate">
                                    {payable.barcode}
                                  </span>
                                }
                              />
                            </div>
                            <CopyButton
                              value={payable.barcode}
                              label="Copiar código de barras"
                              successMessage="Código copiado"
                            />
                          </div>
                        )}
                        {payable.pixKey && (
                          <div className="flex items-end gap-2">
                            <div className="min-w-0 flex-1">
                              <Field
                                label="Chave PIX"
                                value={
                                  <span className="block truncate">
                                    {payable.pixKey}
                                  </span>
                                }
                              />
                            </div>
                            <CopyButton
                              value={payable.pixKey}
                              label="Copiar PIX"
                              successMessage="PIX copiado"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {recurrenceDisplay && recurringBill && (
                      <div className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-1.5 text-sm font-medium">
                            <Repeat className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            Recorrência
                          </p>
                          <Badge
                            variant="outline"
                            className={
                              recurringBill.active
                                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-500"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            }
                          >
                            {recurringBill.active ? "Ativa" : "Encerrada"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <Field
                            label="Periodicidade"
                            value={recurrenceDisplay.periodicityLabel}
                          />
                          <Field
                            label="Próxima geração"
                            value={
                              insights?.nextGenerationDate
                                ? formatDateOnlyBR(insights.nextGenerationDate)
                                : "—"
                            }
                          />
                          <Field
                            label="Início"
                            value={recurrenceDisplay.startLabel}
                          />
                          <Field
                            label="Fim"
                            value={recurrenceDisplay.endLabel}
                          />
                          <Field
                            label="Ocorrências geradas"
                            value={insights?.occurrencesGenerated ?? "—"}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setOccurrencesDrawerOpen(true)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver Ocorrências
                          </Button>
                          {recurringBill.active && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setEndRecurrenceOpen(true)}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Encerrar Recorrência
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <Field
                      label="Observação"
                      value={payable.description || "—"}
                    />
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <ol className="space-y-4">
                      {events.map((event, index) => (
                        <li key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                              <event.icon className="h-3.5 w-3.5" />
                            </span>
                            {index < events.length - 1 && (
                              <span className="bg-border mt-1 w-px flex-1" />
                            )}
                          </div>
                          <div className="-mt-0.5 pb-3">
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-muted-foreground text-xs">
                              Por {event.actor} · {formatDateTimeBR(event.date)}
                            </p>
                            {event.detail && (
                              <p className="text-muted-foreground text-xs">
                                {event.detail}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </TabsContent>

                  <TabsContent value="attachments" className="mt-4">
                    <AccountsPayableAttachmentsPanel
                      payable={payable}
                      canManage={canEditThis}
                    />
                  </TabsContent>
                </div>
              </Tabs>

              <div className="flex flex-wrap gap-2 border-t p-4">
                {canPayThis && (
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setPaying(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar pagamento
                  </Button>
                )}
                {canEditThis && (
                  <Button
                    type="button"
                    variant="outline"
                    className={canPayThis ? "" : "flex-1"}
                    onClick={() => onEdit?.(payable)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar conta
                  </Button>
                )}
                {canCancelThis && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={onCancelClick}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar
                  </Button>
                )}
                {canDeleteThis && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                )}
                {canPayThis && <SendWhatsAppReminderButton payable={payable} />}
                {/* Sempre visível — o X do canto do Sheet some fácil no
                    mobile; este garante um jeito claro de fechar mesmo
                    quando a conta não tem nenhuma ação disponível (ex:
                    conta paga/cancelada, sem permissão de edição). */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                  Fechar
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <PayAccountsPayableDialog
        payable={payable}
        open={paying}
        onOpenChange={setPaying}
      />

      <DeleteAccountsPayableDialog
        payable={payable}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={() => onOpenChange(false)}
      />

      <AccountsPayableRecurrenceScopeDialog
        open={cancelScopeOpen}
        onOpenChange={setCancelScopeOpen}
        title="Esta conta pertence a uma recorrência"
        description="Como deseja cancelar?"
        singleLabel="Apenas esta conta"
        seriesLabel="Encerrar recorrência"
        confirmLabel="Confirmar"
        isPending={cancelAccountsPayable.isPending}
        onConfirm={(scope) => handleCancel(scope)}
      />

      <ConfirmDialog
        open={cancelPaymentConfirmOpen}
        onOpenChange={setCancelPaymentConfirmOpen}
        title="Cancelar pagamento"
        cancelLabel="Voltar"
        confirmLabel="Cancelar pagamento"
        pendingLabel="Cancelando..."
        isPending={cancelAccountsPayable.isPending}
        onConfirm={() => void handleCancel("SINGLE")}
      />

      {payable?.recurringBillId && (
        <>
          <RecurringBillOccurrencesDrawer
            recurringBillId={payable.recurringBillId}
            currentPayableId={payable.id}
            open={occurrencesDrawerOpen}
            onOpenChange={setOccurrencesDrawerOpen}
            onOpenAccount={(occurrence) => {
              setOccurrencesDrawerOpen(false);
              onOpenOccurrence?.(occurrence);
            }}
          />
          <EndRecurringBillDialog
            recurringBillId={payable.recurringBillId}
            open={endRecurrenceOpen}
            onOpenChange={setEndRecurrenceOpen}
          />
        </>
      )}
    </>
  );
}
