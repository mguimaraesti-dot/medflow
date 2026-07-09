"use client";

import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  exportReportToExcel,
  exportReportToImage,
  exportReportToPdf,
  type ReportExportInput,
} from "@/shared/lib/export/report-export";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

async function runExport(
  kind: "pdf" | "excel" | "image",
  input: ReportExportInput<unknown>,
) {
  try {
    if (kind === "pdf") await exportReportToPdf(input);
    else if (kind === "excel") await exportReportToExcel(input);
    else await exportReportToImage(input);
    toast.success("Exportação gerada.");
  } catch {
    toast.error("Não foi possível gerar a exportação.");
  }
}

/**
 * Exportação de relatório (PDF/Excel/Imagem) — mesmo utilitário serve
 * pro botão "Exportar" no topo da tabela (`rows` = tudo que está
 * filtrado na tela) e pros botões da coluna "Ações" de cada linha
 * (`rows` = 1 item só).
 *
 * `variant="button"` — dropdown com rótulo "Exportar" (uso no topo da
 * tabela). `variant="icons"` — 3 botões-ícone lado a lado, sem menu
 * (uso na coluna Ações, ao lado de Visualizar/Mais opções).
 */
export function ReportExportMenu<T>({
  title,
  columns,
  rows,
  variant = "button",
}: ReportExportInput<T> & { variant?: "button" | "icons" }) {
  const input = { title, columns, rows } as ReportExportInput<unknown>;

  if (variant === "icons") {
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => runExport("pdf", input)}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="sr-only">Exportar PDF</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exportar PDF</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => runExport("excel", input)}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="sr-only">Exportar Excel</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exportar Excel</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => runExport("image", input)}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Exportar Imagem</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exportar Imagem (WhatsApp)</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline">
          Exportar
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => runExport("pdf", input)}>
          <FileText className="h-4 w-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport("excel", input)}>
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => runExport("image", input)}>
          <ImageIcon className="h-4 w-4" />
          Exportar Imagem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
