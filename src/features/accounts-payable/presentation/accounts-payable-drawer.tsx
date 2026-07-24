"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Eye,
  MoreHorizontal,
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { CopyToWhatsAppButton } from "./copy-to-whatsapp-button";
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
import { useMediaQuery } from "@/shared/hooks/use-media-query";
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
  // Mobile vira bottom-sheet arrastável (vaul); desktop mantém o Sheet lateral de sempre.
  const isMobile = useMediaQuery("(max-width: 1023px)");
  // Snap points (vaul): sem isso a folha só cresce até caber o conteúdo
  // (h-auto) — contas curtas (ex. Darf) paravam em ~70vh, deixando a
  // lista de fundo visível acima ("espaço morto"). Abre sempre no ponto
  // alto (0.9) e permite arrastar até 1 ou soltar pra fechar; reabrir
  // nunca deve manter o snap onde o usuário deixou da vez anterior.
  const [snap, setSnap] = useState<number | string | null>(0.9);
  useEffect(() => {
    if (open) setSnap(0.9);
  }, [open]);

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
  /**
   * "Último envio: ... — automático/manual, por quem" no campo abaixo —
   * o AuditLog já foi buscado pra aba Histórico (Etapa 1b), então achar
   * o evento WHATSAPP_REMINDER_SENT mais recente aqui não custa nenhuma
   * consulta extra (diferente da coluna da lista, que não tem esse
   * join — ver `ReminderStatusIndicator` em accounts-payable-table.tsx).
   */
  const lastReminderSentEvent = auditLog
    ?.filter((entry) => entry.action === "WHATSAPP_REMINDER_SENT")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];

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

  const HeaderTag = isMobile ? DrawerHeader : SheetHeader;
  const TitleTag = isMobile ? DrawerTitle : SheetTitle;

  const drawerBody = payable && badge && dueDateDisplay && (
    <>
      <HeaderTag className="space-y-3 pb-2">
        {/* DrawerContent (vaul) não tem X embutido como o SheetContent
            (que já mostra um via showCloseButton) — sem isso, mobile
            ficaria só com arrastar/tocar fora pra fechar. */}
        {isMobile && (
          <DrawerClose
            aria-label="Fechar"
            className="text-muted-foreground absolute top-4 right-4 z-10 rounded-xs opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </DrawerClose>
        )}
        <Badge variant="outline" className={cn("w-fit", badge.badgeClassName)}>
          {badge.label}
        </Badge>
        <div>
          <p className="text-muted-foreground text-xs">Conta a Pagar</p>
          <TitleTag className="text-xl">
            {supplierName ?? payable.description}
          </TitleTag>
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
      </HeaderTag>

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
            <p className="text-sm font-medium">Informações principais</p>
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
                      {getPaymentConfirmationDisplayName(paymentConfirmation)}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Origem do Pagamento"
                value={
                  payable.paymentOrigin === "COFRE" ? "🟢 Cofre" : "🏦 Banco"
                }
              />
              <Field
                label="Último lembrete de WhatsApp"
                value={
                  payable.lastReminderSentAt ? (
                    <span>
                      {formatDateTimeBR(payable.lastReminderSentAt)}
                      <span className="text-muted-foreground block text-xs font-normal">
                        {lastReminderSentEvent?.userId === null
                          ? "Automático"
                          : lastReminderSentEvent?.userName
                            ? `Manual, por ${lastReminderSentEvent.userName}`
                            : "Manual"}
                      </span>
                    </span>
                  ) : (
                    "—"
                  )
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
                    {getPaymentConfirmationDisplayName(paymentConfirmation)}
                  </span>
                </p>
                <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                  <span>Origem: {paymentConfirmation.source}</span>
                  <span>
                    Em: {formatDateTimeBR(paymentConfirmation.confirmedAt)}
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
                  <Field label="Início" value={recurrenceDisplay.startLabel} />
                  <Field label="Fim" value={recurrenceDisplay.endLabel} />
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

            <Field label="Observação" value={payable.description || "—"} />
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

      {/* pb extra respeita a safe-area do aparelho (notch/faixa de gestos)
          — sem isso, arrastar a folha até quase o topo aproxima a barra
          da faixa de gestos do Android. Só nesta barra: o resto do app
          ainda não trata safe-area em nenhum lugar (dívida geral, fora
          de escopo aqui). No desktop `env(safe-area-inset-bottom)` é 0,
          então o resultado é idêntico ao `p-4` de antes. */}
      <div className="flex items-center gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {canPayThis && (
          <Button
            type="button"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setPaying(true)}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isMobile ? "Confirmar" : "Confirmar pagamento"}
          </Button>
        )}
        {/* "Lembrar" (SendWhatsAppReminderButton) promovido pra superfície
            em mobile e desktop — validado no protótipo de UX como a ação
            mais usada depois de Confirmar. "Copiar para WhatsApp" e as
            demais ações continuam só no "⋯". */}
        {canPayThis && (
          <SendWhatsAppReminderButton
            payable={payable}
            label="Lembrar"
            className="shrink-0 border-green-600/30 bg-green-600/10 text-green-700 hover:bg-green-600/15 dark:text-green-500"
          />
        )}
        {/* Secundárias no "⋯" — 1 linha fixa em vez de até 6
                    botões empilhando (Editar/Cancelar/Excluir/2x WhatsApp).
                    "Fechar" foi removido de propósito: já existe o ✕ no
                    canto do Sheet, e arrastar pra baixo/tocar fora também
                    fecha — era um botão de largura total fazendo o que
                    três gestos já fazem. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={canPayThis ? "shrink-0" : "flex-1"}
              size={canPayThis ? "icon" : "default"}
            >
              <MoreHorizontal className="h-4 w-4" />
              {canPayThis ? (
                <span className="sr-only">Mais ações</span>
              ) : (
                "Mais ações"
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canEditThis && (
              <DropdownMenuItem onClick={() => onEdit?.(payable)}>
                <Pencil className="h-4 w-4" />
                Editar conta
              </DropdownMenuItem>
            )}
            {/* `onSelect` com preventDefault mantém o menu aberto
                        — sem isso, o feedback visual desses dois botões
                        (ícone "Copiado!"/spinner de envio) some junto com
                        o menu antes do usuário conseguir ver. */}
            <DropdownMenuItem
              asChild
              onSelect={(event) => event.preventDefault()}
            >
              <CopyToWhatsAppButton
                payable={payable}
                supplierName={supplierName ?? payable.description}
                variant="full"
                className="hover:bg-accent h-auto w-full justify-start border-0 bg-transparent px-2 py-1.5 font-normal shadow-none"
              />
            </DropdownMenuItem>
            {canCancelThis && (
              <DropdownMenuItem variant="destructive" onClick={onCancelClick}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </DropdownMenuItem>
            )}
            {canDeleteThis && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleting(true)}
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={onOpenChange}
          snapPoints={[0.9, 1]}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
        >
          {/* max-h um pouco abaixo de 100vh — alto o bastante pra não
              cortar o snap de 1 (tela cheia), baixo o bastante pra sempre
              sobrar uma fresta da lista atrás pra tocar-fora fechar. */}
          <DrawerContent className="flex max-h-[95vh] flex-col gap-0">
            {drawerBody}
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 sm:max-w-lg"
          >
            {drawerBody}
          </SheetContent>
        </Sheet>
      )}

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
