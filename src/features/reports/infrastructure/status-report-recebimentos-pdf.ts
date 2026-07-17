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

type KpiIconKind = "cash" | "pix" | "count" | "kit";

/**
 * Ícones dos 4 KPIs — desenhados nativamente com as primitivas do jsPDF
 * (retângulo/círculo/`lines` como polígono), não os `ICON_PATHS` de
 * `report-image-kit.tsx`: aqueles são paths de SVG feitos pra Satori
 * (usado pelos outros 2 Status Reports), e o jsPDF não tem parser de
 * path SVG sem um plugin extra (`svg2pdf.js`, não instalado). Decisão
 * confirmada com o usuário antes de criar ícones novos. Cada um cabe
 * numa caixa de ~5mm de altura a partir de `topY`, centralizado em `centerX`.
 */
function renderKpiIcon(
  doc: jsPDF,
  kind: KpiIconKind,
  centerX: number,
  topY: number,
  color: Rgb,
): void {
  const [r, g, b] = color;
  switch (kind) {
    case "cash": {
      // Nota de dinheiro: retângulo arredondado + selo (círculo) central.
      const width = 6;
      const height = 3.6;
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.35);
      doc.roundedRect(centerX - width / 2, topY, width, height, 0.6, 0.6);
      doc.setFillColor(r, g, b);
      doc.circle(centerX, topY + height / 2, 0.9, "F");
      break;
    }
    case "pix": {
      // Raio — hexágono via `lines()` (deltas fecham em 0,0 por construção).
      doc.setFillColor(r, g, b);
      doc.lines(
        [
          [-1.5, 2.6],
          [0.9, 0],
          [-1.2, 2.4],
          [2.0, -2.9],
          [-0.9, 0],
          [0.7, -2.1],
        ],
        centerX + 0.8,
        topY,
        [1, 1],
        "F",
        true,
      );
      break;
    }
    case "count": {
      // Linhas de recibo/lista.
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.5);
      const widths = [4.4, 3.4, 3.9];
      widths.forEach((width, index) => {
        const lineY = topY + 0.6 + index * 1.4;
        doc.line(centerX - width / 2, lineY, centerX + width / 2, lineY);
      });
      break;
    }
    case "kit": {
      // Frasco: gargalo (retângulo) + corpo (trapézio via `lines()`).
      doc.setFillColor(r, g, b);
      doc.rect(centerX - 0.6, topY, 1.2, 1.4, "F");
      doc.lines(
        [
          [1.2, 0],
          [1.1, 3.2],
          [-3.4, 0],
          [1.1, -3.2],
        ],
        centerX - 0.6,
        topY + 1.4,
        [1, 1],
        "F",
        true,
      );
      break;
    }
  }
}

export function renderStatusReportRecebimentosPdf(
  input: StatusReportRecebimentosSummary,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN;

  // Espaço reservado pro logo (32x14mm) — a imagem é encaixada dentro
  // dele preservando a proporção original (nunca assumir a proporção
  // atual: o logo é enviado pela organização e pode ser quadrado, largo
  // ou alto). `getImageProperties` lê as dimensões reais do arquivo;
  // sobra espaço dentro do box em vez de esticar a imagem.
  const LOGO_BOX_WIDTH = 32;
  const LOGO_BOX_HEIGHT = 14;
  try {
    const logoDataUri = loadOrganizationLogoDataUri();
    const { width: logoWidth, height: logoHeight } =
      doc.getImageProperties(logoDataUri);
    const scale = Math.min(
      LOGO_BOX_WIDTH / logoWidth,
      LOGO_BOX_HEIGHT / logoHeight,
    );
    const drawWidth = logoWidth * scale;
    const drawHeight = logoHeight * scale;
    doc.addImage(
      logoDataUri,
      "JPEG",
      MARGIN + (LOGO_BOX_WIDTH - drawWidth) / 2,
      y + (LOGO_BOX_HEIGHT - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
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
    icon: KpiIconKind;
  }[] = [
    {
      label: "DINHEIRO",
      value: formatCurrencyBRL(input.cashTotal),
      note: "fica em caixa",
      color: GREEN,
      icon: "cash",
    },
    {
      label: "PIX",
      value: formatCurrencyBRL(input.pixTotal),
      note: "direto p/ conta bancária",
      color: BLUE,
      bg: BLUE_LIGHT,
      icon: "pix",
    },
    {
      label: "LANÇAMENTOS",
      value: String(input.totalCount),
      note: `${input.cashCount} dinheiro · ${input.pixCount} PIX`,
      color: TEXT_DARK,
      icon: "count",
    },
    {
      label: "FRASCOS",
      value: String(input.totalFrascos),
      note: `${totalKits} kit${totalKits === 1 ? "" : "s"} vendido${totalKits === 1 ? "" : "s"}`,
      color: AMBER,
      bg: AMBER_LIGHT,
      icon: "kit",
    },
  ];
  const kpiGap = 3;
  const kpiWidth = (CONTENT_WIDTH - kpiGap * 3) / 4;
  const KPI_CARD_HEIGHT = 27;
  kpis.forEach((kpi, index) => {
    const x = MARGIN + index * (kpiWidth + kpiGap);
    const centerX = x + kpiWidth / 2;
    if (kpi.bg) {
      doc.setFillColor(...kpi.bg);
      doc.rect(x, y, kpiWidth, KPI_CARD_HEIGHT, "F");
    }
    doc.setDrawColor(...BORDER);
    doc.rect(x, y, kpiWidth, KPI_CARD_HEIGHT);
    renderKpiIcon(doc, kpi.icon, centerX, y + 3, kpi.color);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.label, centerX, y + 11.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, centerX, y + 19, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.note, centerX, y + 24, { align: "center" });
  });

  y += KPI_CARD_HEIGHT + 6;

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

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_Y - 6, PAGE_WIDTH - MARGIN, FOOTER_Y - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("Relatório gerado pelo MedFlow", MARGIN, FOOTER_Y);

    renderFooterBrand(doc);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Página ${page} de ${pageCount}`, PAGE_WIDTH - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Marca MedFlow no rodapé — mesmo padrão dos outros dois Status Reports
 * (ícone das 3 barras + "MedFlow" + tagline), adaptado pro contexto do
 * jsPDF: as barras do `MedFlowIcon` (`report-image-kit.tsx`) são só 3
 * `rect` arredondados, então dá pra desenhar direto com `roundedRect`
 * em vez de precisar de um parser de path SVG (jsPDF não tem um sem
 * plugin extra). DISCRETO de propósito — fonte pequena, cores neutras,
 * nada compete com o conteúdo do relatório. Centralizada na página, com
 * os dois textos existentes (esquerda/direita) mantidos — larguras reais
 * medidas via `getTextWidth`, cabem os 3 elementos sem apertar.
 */
function renderFooterBrand(doc: jsPDF): void {
  const wordmarkY = FOOTER_Y - 2;
  const taglineY = FOOTER_Y + 1.8;
  const tagline = "Gestão financeira inteligente para clínicas";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  const taglineWidth = doc.getTextWidth(tagline);
  const textBlockX = PAGE_WIDTH / 2 - taglineWidth / 2;

  const barGap = 1.5;
  const barWidth = 1.1;
  const barSpacing = 0.6;
  const barHeights: number[] = [2.4, 3.8, 5.2];
  const barColors: Rgb[] = [
    [96, 165, 250],
    [37, 99, 235],
    [30, 58, 138],
  ];
  const barsWidth =
    barHeights.length * barWidth + (barHeights.length - 1) * barSpacing;
  const barsStartX = textBlockX - barGap - barsWidth;
  const barBaseY = taglineY;

  barHeights.forEach((height, index) => {
    doc.setFillColor(...barColors[index]);
    doc.roundedRect(
      barsStartX + index * (barWidth + barSpacing),
      barBaseY - height,
      barWidth,
      height,
      0.3,
      0.3,
      "F",
    );
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BLUE);
  doc.text("MedFlow", textBlockX, wordmarkY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(tagline, textBlockX, taglineY);
}
