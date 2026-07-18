"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
import { useSendStatusReportSafeWhatsApp } from "./use-send-status-report-safe-whatsapp";

/** Tela do Relatório Executivo do Cofre — mesma estrutura dos outros Status Reports (preview 1080xN, baixar, enviar por WhatsApp). */
export function StatusReportSafeScreen() {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("MONTH");
  const [periodCustom, setPeriodCustom] = useState<PeriodRange | undefined>();
  const [imageKey, setImageKey] = useState(0);
  const sendWhatsApp = useSendStatusReportSafeWhatsApp();

  const range = computePeriodRange(periodPreset, periodCustom);
  const imageUrl = `/api/reports/status-report-safe/image?dateFrom=${range.from.toISOString()}&dateTo=${range.to.toISOString()}`;

  async function handleSendWhatsApp() {
    try {
      await sendWhatsApp.mutateAsync({
        dateFrom: range.from,
        dateTo: range.to,
      });
      toast.success("Relatório Executivo do Cofre enviado por WhatsApp.");
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
          Relatório Executivo do Cofre
        </h1>
        <p className="text-muted-foreground text-sm">
          Posição e movimentação do dinheiro em espécie no cofre, pronto pra
          baixar ou enviar por WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Relatório Executivo do Cofre</CardTitle>
          <PeriodSelector
            variant="select"
            size="sm"
            preset={periodPreset}
            custom={periodCustom}
            onChange={(preset, custom) => {
              setPeriodPreset(preset);
              setPeriodCustom(custom);
              setImageKey((key) => key + 1);
            }}
          />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border shadow-sm">
            <Image
              key={imageKey}
              src={imageUrl}
              alt="Relatório Executivo do Cofre"
              width={1080}
              height={1920}
              unoptimized
              className="h-auto w-full"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <a href={imageUrl} download="relatorio-executivo-cofre.png">
                <Download className="h-4 w-4" />
                Baixar imagem
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
