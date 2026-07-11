"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { Button } from "@/shared/ui/button";
import { ApiError } from "@/shared/lib/api-client";
import { useSendSafePeriodReportWhatsApp } from "./use-send-safe-period-report-whatsapp";

export function SendSafePeriodReportWhatsAppButton({
  dateFrom,
  dateTo,
}: {
  dateFrom: Date;
  dateTo: Date;
}) {
  const sendReport = useSendSafePeriodReportWhatsApp();

  async function handleSend() {
    try {
      await sendReport.mutateAsync({ dateFrom, dateTo });
      toast.success("Relatório enviado por WhatsApp.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar o relatório.";
      toast.error(message);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="text-green-700 dark:text-green-500"
      disabled={sendReport.isPending}
      onClick={handleSend}
    >
      {sendReport.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <WhatsAppIcon className="h-4 w-4" />
      )}
      Enviar por WhatsApp
    </Button>
  );
}
