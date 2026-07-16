"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import {
  PeriodSelector,
  computePeriodRange,
  type PeriodPreset,
  type PeriodRange,
} from "@/shared/components/period-selector";
import { WhatsAppIcon } from "@/shared/components/whatsapp-icon";
import { ApiError } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useSendStatusReportRecebimentosWhatsApp } from "./use-send-status-report-recebimentos-whatsapp";

/**
 * Tela do Relatório de Recebimentos — mesma estrutura dos outros Status
 * Reports (preview, baixar, enviar por WhatsApp), mas o preview é um PDF
 * de múltiplas páginas (`<embed>`) em vez de uma imagem única (`<Image>`),
 * já que este relatório pagina via `jspdf-autotable`.
 */
export function StatusReportRecebimentosScreen() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [pdfKey, setPdfKey] = useState(0);
  const sendWhatsApp = useSendStatusReportRecebimentosWhatsApp();

  const range = computePeriodRange(periodPreset, periodCustom);
  const pdfUrl = `/api/reports/status-report-recebimentos/pdf?dateFrom=${range.from.toISOString()}&dateTo=${range.to.toISOString()}`;

  async function handleSendWhatsApp() {
    try {
      await sendWhatsApp.mutateAsync({
        dateFrom: range.from,
        dateTo: range.to,
      });
      toast.success("Relatório de Recebimentos enviado por WhatsApp.");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Não foi possível enviar o relatório.";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/reports"
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Relatórios
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Relatório de Recebimentos
        </h1>
        <p className="text-muted-foreground text-sm">
          Detalhamento lançamento a lançamento das entradas do período, com nome
          do paciente — pronto pra baixar em PDF ou enviar por WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relatório de Recebimentos</CardTitle>
          <PeriodSelector
            variant="select"
            size="sm"
            preset={periodPreset}
            custom={periodCustom}
            onChange={(preset, custom) => {
              setPeriodPreset(preset);
              setPeriodCustom(custom);
              setPdfKey((key) => key + 1);
            }}
          />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="h-[600px] w-full overflow-hidden rounded-2xl border shadow-sm">
            <embed
              key={pdfKey}
              src={pdfUrl}
              type="application/pdf"
              className="h-full w-full"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <a href={pdfUrl} download="relatorio-recebimentos.pdf">
                <Download className="h-4 w-4" />
                Baixar PDF
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="text-green-700 dark:text-green-500"
              disabled={sendWhatsApp.isPending}
              onClick={handleSendWhatsApp}
            >
              {sendWhatsApp.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WhatsAppIcon className="h-4 w-4" />
              )}
              Enviar por WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
