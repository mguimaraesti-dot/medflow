import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatDateOnlyLocalBR,
  formatTimeBR,
} from "@/shared/lib/format";
import type { StatusReportRecebimentosSummary } from "../domain/status-report-recebimentos.entity";
import { loadOrganizationLogoDataUri } from "./report-image-kit";

/**
 * Relatório de Recebimentos — PDF de múltiplas páginas via `jspdf` +
 * `jspdf-autotable`, ao contrário dos outros dois Status Reports (imagem
 * única 1080xN via `next/og`/Satori). Motivo da divergência: uma tabela de
 * ~100 lançamentos renderizada via Satori levou ~180s localmente (medido
 * antes de virar PDF) — inviável num serverless da Vercel. `autoTable`
 * pagina a tabela sozinha (repete o cabeçalho a cada página A4), sem esse
 * gargalo, então não há teto de linhas aqui.
 */

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 10;

type Rgb = [number, number, number];

const BLUE: Rgb = [37, 99, 235];
const GREEN: Rgb = [22, 163, 74];
const GREEN_DARK: Rgb = [22, 101, 52];
const TEXT_DARK: Rgb = [30, 41, 59];
const TEXT_MUTED: Rgb = [100, 116, 139];
const AMBER: Rgb = [180, 83, 9];
const AMBER_LIGHT: Rgb = [255, 251, 235];
const GREEN_LIGHT: Rgb = [240, 253, 244];
const BLUE_LIGHT: Rgb = [239, 246, 255];
const BORDER: Rgb = [229, 231, 235];
const HEAD_BG: Rgb = [241, 243, 247];

/** `jspdf-autotable` anexa `lastAutoTable` ao doc em runtime — sem tipo oficial pra isso (`jsPDFDocument` é `any` no pacote). */
function getFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - 20) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

export function renderStatusReportRecebimentosPdf(
  input: StatusReportRecebimentosSummary,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN;

  try {
    doc.addImage(loadOrganizationLogoDataUri(), "JPEG", MARGIN, y, 32, 14);
  } catch {
    // Sem logo, segue sem quebrar o relatório.
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BLUE);
  doc.text("RELATÓRIO DE RECEBIMENTOS", PAGE_WIDTH - MARGIN, y + 5, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    "Detalhamento dos lançamentos do caixa recepção",
    PAGE_WIDTH - MARGIN,
    y + 10,
    { align: "right" },
  );

  y += 20;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.rect(MARGIN, y, CONTENT_WIDTH, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("PERÍODO", MARGIN + 4, y + 5);
  doc.text("EMITIDO EM", PAGE_WIDTH - MARGIN - 4, y + 5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  doc.text(
    `${formatDateOnlyBR(input.dateFrom)} a ${formatDateOnlyBR(input.dateTo)}`,
    MARGIN + 4,
    y + 9.5,
  );
  doc.text(
    `${formatDateOnlyBR(input.generatedAt)} às ${formatTimeBR(input.generatedAt)}`,
    PAGE_WIDTH - MARGIN - 4,
    y + 9.5,
    { align: "right" },
  );

  y += 18;

  doc.setFillColor(...GREEN_LIGHT);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREEN_DARK);
  doc.text("TOTAL RECEBIDO", MARGIN + 5, y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...GREEN);
  doc.text(formatCurrencyBRL(input.totalAmount), MARGIN + 5, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GREEN_DARK);
  doc.text(
    `${input.totalCount} lançamento${input.totalCount === 1 ? "" : "s"} no período`,
    MARGIN + 5,
    y + 20,
  );

  y += 28;

  const totalKits = input.kitRows.reduce((sum, row) => sum + row.count, 0);
  const kpis: {
    label: string;
    value: string;
    note: string;
    color: Rgb;
    bg?: Rgb;
  }[] = [
    {
      label: "DINHEIRO",
      value: formatCurrencyBRL(input.cashTotal),
      note: "fica em caixa",
      color: GREEN,
    },
    {
      label: "PIX",
      value: formatCurrencyBRL(input.pixTotal),
      note: "direto p/ conta bancária",
      color: BLUE,
      bg: BLUE_LIGHT,
    },
    {
      label: "LANÇAMENTOS",
      value: String(input.totalCount),
      note: `${input.cashCount} dinheiro · ${input.pixCount} PIX`,
      color: TEXT_DARK,
    },
    {
      label: "FRASCOS",
      value: String(input.totalFrascos),
      note: `${totalKits} kit${totalKits === 1 ? "" : "s"} vendido${totalKits === 1 ? "" : "s"}`,
      color: AMBER,
      bg: AMBER_LIGHT,
    },
  ];
  const kpiGap = 3;
  const kpiWidth = (CONTENT_WIDTH - kpiGap * 3) / 4;
  kpis.forEach((kpi, index) => {
    const x = MARGIN + index * (kpiWidth + kpiGap);
    if (kpi.bg) {
      doc.setFillColor(...kpi.bg);
      doc.rect(x, y, kpiWidth, 20, "F");
    }
    doc.setDrawColor(...BORDER);
    doc.rect(x, y, kpiWidth, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.label, x + kpiWidth / 2, y + 5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, x + kpiWidth / 2, y + 12, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.note, x + kpiWidth / 2, y + 17, { align: "center" });
  });

  y += 26;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Lançamentos", MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    head: [["DATA/HORA", "CATEGORIA", "PACIENTE", "FRASCOS", "FORMA", "VALOR"]],
    body: input.entries.map((entry) => [
      `${formatDateOnlyLocalBR(entry.occurredAt)}\n${formatTimeBR(entry.occurredAt)}`,
      entry.categoryLabel,
      entry.patientName,
      entry.frascos === null ? "—" : String(entry.frascos),
      entry.paymentMethodLabel,
      formatCurrencyBRL(entry.amount),
    ]),
    headStyles: {
      fillColor: HEAD_BG,
      textColor: TEXT_MUTED,
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: { fontSize: 8, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 22 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 22 },
      5: { cellWidth: 24, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        data.cell.styles.textColor = GREEN_DARK;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = getFinalY(doc) + 8;

  if (input.kitRows.length > 0) {
    y = ensureSpace(doc, y, 20 + input.kitRows.length * 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT_DARK);
    doc.text("Frascos vendidos no período", MARGIN, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN, bottom: 16 },
      head: [["Categoria", "Cálculo", "Frascos"]],
      body: input.kitRows.map((row) => [
        row.label,
        `${row.count} kit${row.count === 1 ? "" : "s"} × ${row.kitSize}`,
        String(row.frascos),
      ]),
      foot: [["TOTAL DE FRASCOS", "", String(input.totalFrascos)]],
      headStyles: {
        fillColor: AMBER_LIGHT,
        textColor: AMBER,
        fontStyle: "bold",
        fontSize: 8,
      },
      footStyles: {
        fillColor: AMBER_LIGHT,
        textColor: AMBER,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8, textColor: TEXT_DARK },
    });

    y = getFinalY(doc) + 8;
  }

  y = ensureSpace(doc, y, 14);
  const totalGap = 6;
  const totalCardWidth = (CONTENT_WIDTH - totalGap) / 2;
  const totals: { label: string; count: number; amount: string; color: Rgb }[] =
    [
      {
        label: "TOTAL DINHEIRO",
        count: input.cashCount,
        amount: input.cashTotal,
        color: GREEN,
      },
      {
        label: "TOTAL PIX",
        count: input.pixCount,
        amount: input.pixTotal,
        color: BLUE,
      },
    ];
  totals.forEach((total, index) => {
    const x = MARGIN + index * (totalCardWidth + totalGap);
    doc.setFillColor(...total.color);
    doc.roundedRect(x, y, totalCardWidth, 14, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(total.label, x + 4, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `${total.count} lançamento${total.count === 1 ? "" : "s"}`,
      x + 4,
      y + 11,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(formatCurrencyBRL(total.amount), x + totalCardWidth - 4, y + 9, {
      align: "right",
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Relatório gerado pelo MedFlow", MARGIN, FOOTER_Y);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
