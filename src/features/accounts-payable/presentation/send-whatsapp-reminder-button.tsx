"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { ApiError } from "@/shared/lib/api-client";
import { useSendWhatsAppReminder } from "./use-send-whatsapp-reminder";
import type { AccountsPayableResponseDTO } from "../application/dtos/accounts-payable.response-dto";

/** Some da tela quando a conta já não está PENDENTE — paga/cancelada não recebe mais lembrete. */
export function SendWhatsAppReminderButton({
  payable,
  className,
}: {
  payable: AccountsPayableResponseDTO;
  /** Sobrepõe o estilo padrão — usado pelo Drawer mobile pra parecer um item de menu em vez de um botão com borda. */
  className?: string;
}) {
  const sendReminder = useSendWhatsAppReminder();

  if (payable.status !== "PENDING") return null;

  async function handleSend() {
    try {
      await sendReminder.mutateAsync(payable.id);
      toast.success("Lembrete enviado por WhatsApp.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar o lembrete.";
      toast.error(message);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("text-green-700 dark:text-green-500", className)}
      disabled={sendReminder.isPending}
      onClick={handleSend}
    >
      {sendReminder.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <WhatsAppIcon className="h-4 w-4" />
      )}
      Enviar WhatsApp agora
    </Button>
  );
}
