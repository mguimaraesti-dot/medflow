"use client";

import { Eye } from "lucide-react";
import { ReportExportMenu } from "./report-export-menu";
import type { ReportExportColumn } from "@/shared/lib/export/report-export";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

/**
 * Coluna "Ações" padrão de qualquer tabela de relatório: Visualizar
 * (opcional, quando o relatório tem um Drawer de detalhe) + os 3
 * botões de exportação da própria linha (PDF/Excel/Imagem). Sem menu
 * "Mais opções" — nenhum relatório tem ação extra pra colocar nele.
 */
export function ReportRowActions<T>({
  onView,
  title,
  columns,
  row,
}: {
  onView?: () => void;
  title: string;
  columns: ReportExportColumn<T>[];
  row: T;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onView}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="sr-only">Visualizar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Visualizar</TooltipContent>
        </Tooltip>
      )}
      <ReportExportMenu
        title={title}
        columns={columns}
        rows={[row]}
        variant="icons"
      />
    </div>
  );
}
