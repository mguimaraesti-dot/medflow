import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatTimeBR,
} from "@/shared/lib/format";
import type { StatusReportContasPagasSummary } from "../domain/status-report-contas-pagas.entity";
import { loadOrganizationLogoDataUri } from "./report-image-kit";

/**
 * Relatório de Contas Pagas — PDF de múltiplas páginas via `jspdf` +
 * `jspdf-autotable`, ao contrário da imagem única 1080xN (`next/og`/Satori)
 * usada antes. Motivo da conversão: categorias e beneficiários precisam
 * listar TODOS os itens do período, sem corte "Top N" — um canvas de
 * altura fixa não escala pra isso (mesmo motivo da conversão do Relatório
 * de Recebimentos, ver `status-report-recebimentos-pdf.ts`). `autoTable`
 * pagina a tabela sozinha (repete o cabeçalho a cada página A4).
 */

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 10;

type Rgb = [number, number, number];

const BLUE: Rgb = [37, 99, 235];
const TEXT_DARK: Rgb = [30, 41, 59];
const TEXT_MUTED: Rgb = [100, 116, 139];
const BORDER: Rgb = [229, 231, 235];
const HEAD_BG: Rgb = [241, 243, 247];

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return [r, g, b];
}

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

const WEEK_CHART_VALUE_SPACE = 6; // espaço reservado pro valor em R$ acima da barra mais alta
const WEEK_CHART_BAR_HEIGHT = 28; // altura máxima de barra (semana com maior valor)
const WEEK_CHART_LABEL_SPACE = 9; // até 2 linhas de rótulo (ex.: "01/07 a 04/07 (parcial)") abaixo da barra
const WEEK_CHART_GAP = 3;

/**
 * "Pagamentos por Semana" como gráfico de barras — jsPDF não tem uma lib
 * de charts, então cada barra é um `roundedRect` com altura proporcional
 * ao maior valor do período, mesma técnica já usada pros cards de KPI/
 * origem deste arquivo. Rótulo da semana pode quebrar em 2 linhas
 * (`splitTextToSize`) pra caber "(parcial)" sem estourar a coluna.
 */
function renderWeeklyBarChart(
  doc: jsPDF,
  top: number,
  weeks: { label: string; amount: string }[],
): void {
  const columnWidth =
    (CONTENT_WIDTH - WEEK_CHART_GAP * (weeks.length - 1)) / weeks.length;
  const maxAmount = Math.max(...weeks.map((week) => Number(week.amount)), 1);
  const baseline = top + WEEK_CHART_VALUE_SPACE + WEEK_CHART_BAR_HEIGHT;

  weeks.forEach((week, index) => {
    const x = MARGIN + index * (columnWidth + WEEK_CHART_GAP);
    const centerX = x + columnWidth / 2;
    const amount = Number(week.amount);
    const barHeight = Math.max(
      (amount / maxAmount) * WEEK_CHART_BAR_HEIGHT,
      1.5,
    );
    const barTop = baseline - barHeight;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_DARK);
    doc.text(formatCurrencyBRL(week.amount), centerX, barTop - 2, {
      align: "center",
    });

    doc.setFillColor(...BLUE);
    doc.roundedRect(x + 1, barTop, columnWidth - 2, barHeight, 1, 1, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_MUTED);
    const labelLines = doc.splitTextToSize(week.label, columnWidth);
    labelLines.forEach((line: string, lineIndex: number) => {
      doc.text(line, centerX, baseline + 4 + lineIndex * 3, {
        align: "center",
      });
    });
  });
}

/**
 * Sinal "+"/"-" em vez de glifo de seta (▲/▼/↑/↓): a fonte padrão do
 * jsPDF (Helvetica, WinAnsi) não tem esses glifos Unicode e os
 * substitui por caracteres corrompidos no PDF final (mesmo motivo já
 * documentado em `status-report-recebimentos-pdf.ts` — lá resolvido
 * desenhando a seta como ícone; aqui, texto puro, então o sinal
 * "+"/"-" resolve sem precisar desenhar nada).
 */
function trendLabel(current: number, previous: number | null): string | null {
  if (previous === null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "-";
  const formatted = Math.abs(change).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${sign}${formatted}% vs período anterior`;
}

export function renderStatusReportContasPagasPdf(
  input: StatusReportContasPagasSummary,
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = MARGIN;

  // Espaço reservado pro logo (32x14mm) — a imagem é encaixada dentro dele
  // preservando a proporção original (o logo é enviado pela organização e
  // pode ser quadrado, largo ou alto — `getImageProperties` lê as
  // dimensões reais em vez de assumir uma proporção fixa).
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
  doc.text("RELATÓRIO DE CONTAS PAGAS", PAGE_WIDTH - MARGIN, y + 5, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(
    "Contas pagas do período — origem, categorias, beneficiários e semanas",
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

  // KPIs: Total Pago + Contas Pagas, cada um com tendência vs. período
  // anterior (esconde a tendência quando não há dado do período anterior —
  // ver `totalPaidPreviousPeriod`/`paidCountPreviousPeriod`, `null` nesse caso).
  const kpiGap = 4;
  const kpiWidth = (CONTENT_WIDTH - kpiGap) / 2;
  const KPI_HEIGHT = 26;
  const totalTrend = trendLabel(
    Number(input.totalPaid),
    input.totalPaidPreviousPeriod === null
      ? null
      : Number(input.totalPaidPreviousPeriod),
  );
  const countTrend = trendLabel(input.paidCount, input.paidCountPreviousPeriod);
  const kpis: { label: string; value: string; trend: string | null }[] = [
    {
      label: "TOTAL PAGO",
      value: formatCurrencyBRL(input.totalPaid),
      trend: totalTrend,
    },
    {
      label: "CONTAS PAGAS",
      value: String(input.paidCount),
      trend: countTrend,
    },
  ];
  kpis.forEach((kpi, index) => {
    const x = MARGIN + index * (kpiWidth + kpiGap);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, kpiWidth, KPI_HEIGHT, 1.5, 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(kpi.label, x + 5, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...TEXT_DARK);
    doc.text(kpi.value, x + 5, y + 16);
    if (kpi.trend) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(kpi.trend, x + 5, y + 22);
    }
  });

  y += KPI_HEIGHT + 8;

  // Origem do pagamento: card colorido por origem (Banco/Cofre), sempre as
  // 2 mesmo com valor zero — mesmo dado de `input.origins`.
  const originGap = 6;
  const originWidth = (CONTENT_WIDTH - originGap) / 2;
  const ORIGIN_HEIGHT = 22;
  input.origins.forEach((origin, index) => {
    const x = MARGIN + index * (originWidth + originGap);
    const color = hexToRgb(origin.color);
    doc.setFillColor(...color);
    doc.roundedRect(x, y, originWidth, ORIGIN_HEIGHT, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(origin.label.toUpperCase(), x + 5, y + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(
      `${origin.count} pagamento${origin.count === 1 ? "" : "s"} · ${origin.percentage.toFixed(1)}%`,
      x + 5,
      y + 13,
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(formatCurrencyBRL(origin.amount), x + 5, y + 19.5);
  });

  y += ORIGIN_HEIGHT + 8;

  // Categorias — TODAS as categorias com pagamento no período (sem corte
  // "Top 5 + Outros", ver doc do use case). Bolinha colorida (mesma cor
  // cadastrada em `Category.color`) desenhada via `didDrawCell` —
  // `autoTable` não tem coluna de "swatch" nativa.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Categorias", MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    head: [["", "Categoria", "Valor", "%"]],
    body: input.categories.map((category) => [
      "",
      category.label,
      formatCurrencyBRL(category.amount),
      `${category.percentage.toFixed(1)}%`,
    ]),
    headStyles: {
      fillColor: HEAD_BG,
      textColor: TEXT_MUTED,
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: { fontSize: 8, textColor: TEXT_DARK },
    columnStyles: {
      0: { cellWidth: 6 },
      2: { cellWidth: 32, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const category = input.categories[data.row.index];
        const [r, g, b] = hexToRgb(category.color);
        doc.setFillColor(r, g, b);
        doc.circle(
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2,
          1.4,
          "F",
        );
      }
    },
  });

  y = getFinalY(doc) + 8;

  // Beneficiários — TODOS os fornecedores/beneficiários com pagamento no
  // período (sem corte "Top 10", mesmo motivo das categorias).
  y = ensureSpace(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Beneficiários", MARGIN, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    head: [["Beneficiário", "Pagamentos", "Valor"]],
    body: input.beneficiaries.map((beneficiary) => [
      beneficiary.name,
      String(beneficiary.paymentsCount),
      formatCurrencyBRL(beneficiary.amount),
    ]),
    headStyles: {
      fillColor: HEAD_BG,
      textColor: TEXT_MUTED,
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: { fontSize: 8, textColor: TEXT_DARK },
    columnStyles: {
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 32, halign: "right" },
    },
  });

  y = getFinalY(doc) + 8;

  // Pagamentos por Semana — gráfico de barras (não tabela): semanas de
  // CALENDÁRIO (domingo a sábado, com "(parcial)" nas pontas), mesma
  // função compartilhada do "Saldo por semana" do Relatório Executivo
  // do Cofre (`buildCalendarWeekBuckets`).
  y = ensureSpace(
    doc,
    y,
    10 +
      WEEK_CHART_VALUE_SPACE +
      WEEK_CHART_BAR_HEIGHT +
      WEEK_CHART_LABEL_SPACE,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Pagamentos por Semana", MARGIN, y);
  y += 6;

  renderWeeklyBarChart(doc, y, input.weeks);
  y += WEEK_CHART_VALUE_SPACE + WEEK_CHART_BAR_HEIGHT + WEEK_CHART_LABEL_SPACE;

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
 * Marca MedFlow no rodapé — mesmo padrão dos outros Status Reports em PDF
 * (`status-report-recebimentos-pdf.ts`): ícone das 3 barras desenhado
 * nativamente com `roundedRect` (jsPDF não tem parser de path SVG sem
 * plugin extra), fonte pequena, cores neutras — discreto de propósito.
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
