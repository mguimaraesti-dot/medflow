import { ImageResponse } from "next/og";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatTimeBR,
} from "@/shared/lib/format";
import type {
  StatusReportCofreCategoryRow,
  StatusReportCofreSummary,
} from "../domain/status-report-cofre.entity";
import {
  BLUE,
  BORDER,
  Icon,
  ICON_PATHS,
  MedFlowIcon,
  loadOrganizationLogoDataUri,
} from "./report-image-kit";

const CANVAS_WIDTH = 1080;
const MIN_CANVAS_HEIGHT = 1500;

// Alturas aproximadas (px) de cada bloco de altura fixa do layout —
// medidas comparando o mock renderizado com o resultado real; não
// precisam ser exatas, só suficientes pra nunca subestimar (sobrar
// espaço em branco no rodapé é preferível a cortar conteúdo).
const HEADER_HEIGHT = 100;
const PERIOD_BOX_HEIGHT = 90;
const HERO_CARD_HEIGHT = 230;
const KPI_ROW_HEIGHT = 195;
// Título da seção + cabeçalho da tabela + barra de total + gaps internos
// (linhas de categoria são somadas à parte, por tabela).
const SECTION_FIXED_HEIGHT = 155;
const CATEGORY_ROW_HEIGHT = 50;
const FOOTER_HEIGHT = 100;
const OUTER_VERTICAL_PADDING = 52; // "26px 52px" no container raiz
const OUTER_GAP = 13; // gap entre os 8 blocos de nível superior (ver SECTION_COUNT)
const SECTION_COUNT = 8; // cabeçalho, período, hero, KPIs, 3 tabelas, rodapé
// Margem de segurança — as constantes acima são aproximações; melhor
// sobrar um respiro no rodapé do que arriscar cortar por 1-2 linhas de
// diferença entre a estimativa e o layout real do Satori.
const SAFETY_MARGIN = 100;

/**
 * Altura do canvas a partir do conteúdo real — soma os blocos de altura
 * fixa (cabeçalho, período, Hero, KPIs, título/cabeçalho/total de cada
 * tabela, rodapé) ao número de linhas de categoria JÁ FILTRADAS (sem
 * categorias zeradas — filtro aplicado no use case, `filterVisibleRows`)
 * vezes a altura de uma linha. Sem isso, o Satori (`ImageResponse`)
 * rasteriza um canvas de tamanho fixo e descarta silenciosamente
 * qualquer conteúdo que ultrapasse a altura — não existe scroll nem
 * auto-altura nessa API.
 */
function calculateImageHeight(input: StatusReportCofreSummary): number {
  const totalRows =
    input.cashIncomeByCategory.length +
    input.pixIncomeByCategory.length +
    input.cashOutcomeByCategory.length;

  const fixedHeight =
    OUTER_VERTICAL_PADDING +
    OUTER_GAP * (SECTION_COUNT - 1) +
    HEADER_HEIGHT +
    PERIOD_BOX_HEIGHT +
    HERO_CARD_HEIGHT +
    KPI_ROW_HEIGHT +
    SECTION_FIXED_HEIGHT * 3 +
    FOOTER_HEIGHT;

  return Math.max(
    MIN_CANVAS_HEIGHT,
    fixedHeight + totalRows * CATEGORY_ROW_HEIGHT + SAFETY_MARGIN,
  );
}

/** Paleta exata validada no protótipo (`prototipo-status-report-v2.html`) — difere um pouco das cores genéricas de `report-image-kit.ts`, por isso local. */
const PAGE_BG = "#F8F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";
const TEXT_SECONDARY = "#475569";

const GREEN = "#16A34A";
const GREEN_LIGHT = "#DCFCE7";
const GREEN_ROW = "#F0FDF4";
const GREEN_DARK = "#15803D";

const BLUE_LIGHT = "#DBEAFE";
const BLUE_ROW = "#EFF6FF";
const BLUE_DARK = "#1D4ED8";

const RED = "#DC2626";
const RED_LIGHT = "#FEE2E2";
const RED_ROW = "#FEF2F2";

function ReportCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function PeriodBox({
  dateFrom,
  dateTo,
  generatedAt,
}: {
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;
}) {
  return (
    <ReportCard
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "22px 30px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 18,
            color: TEXT_MUTED,
            textTransform: "uppercase",
          }}
        >
          <Icon path={ICON_PATHS.calendar} color={TEXT_MUTED} size={18} />
          Período
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>
          {formatDateOnlyBR(dateFrom)} a {formatDateOnlyBR(dateTo)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 18,
            color: TEXT_MUTED,
            textTransform: "uppercase",
          }}
        >
          <Icon path={ICON_PATHS.clock} color={TEXT_MUTED} size={18} />
          Emitido em
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>
          {formatDateOnlyBR(generatedAt)} às {formatTimeBR(generatedAt)}
        </div>
      </div>
    </ReportCard>
  );
}

function HeroCard({
  finalBalance,
  isSurplus,
}: {
  finalBalance: string;
  isSurplus: boolean;
}) {
  const color = isSurplus ? GREEN : RED;
  const bg = isSurplus ? "#ECFDF5" : "#FEF2F2";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        border: `3px solid ${color}`,
        borderRadius: 36,
        padding: "28px 36px",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 800,
            color: isSurplus ? "#166534" : "#991B1B",
            letterSpacing: 1,
          }}
        >
          SALDO FINAL (DINHEIRO)
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: color,
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: 800,
            padding: "6px 18px",
            borderRadius: 40,
          }}
        >
          <Icon
            path={isSurplus ? ICON_PATHS.arrowUp : ICON_PATHS.arrowDown}
            color="#FFFFFF"
            size={16}
          />
          {isSurplus ? "SUPERÁVIT" : "DÉFICIT"}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 900, color }}>
        {formatCurrencyBRL(finalBalance)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 20,
          color: isSurplus ? "#166534" : "#991B1B",
        }}
      >
        Saldo final no Cofre — considera apenas valores recebidos em dinheiro
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  iconPath,
  iconColor,
  iconBg,
  valueColor,
  note,
  dashedBorder,
}: {
  label: string;
  value: string;
  iconPath: string;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
  note?: string;
  dashedBorder?: string;
}) {
  return (
    <ReportCard
      style={{
        flex: 1,
        alignItems: "center",
        gap: 10,
        padding: "20px 12px",
        ...(dashedBorder
          ? { border: `2px dashed ${dashedBorder}`, backgroundColor: BLUE_ROW }
          : {}),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 999,
          backgroundColor: iconBg,
        }}
      >
        <Icon path={iconPath} color={iconColor} size={22} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 15,
          color: dashedBorder ? BLUE : TEXT_MUTED,
          fontWeight: dashedBorder ? 700 : 400,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 800,
          color: valueColor ?? TEXT_DARK,
        }}
      >
        {value}
      </div>
      {note && (
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: BLUE,
            textAlign: "center",
          }}
        >
          {note}
        </div>
      )}
    </ReportCard>
  );
}

function CategoryTable({
  rows,
  headerBg,
  headerColor,
  rowBg,
  borderColor,
  dashed,
}: {
  rows: StatusReportCofreCategoryRow[];
  headerBg: string;
  headerColor: string;
  rowBg: string;
  borderColor: string;
  dashed?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: rowBg,
        border: `${dashed ? 2 : 1}px ${dashed ? "dashed" : "solid"} ${borderColor}`,
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          backgroundColor: headerBg,
          padding: "13px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            fontSize: 15,
            fontWeight: 700,
            color: headerColor,
            textTransform: "uppercase",
          }}
        >
          Categoria
        </div>
        <div
          style={{
            display: "flex",
            width: 100,
            justifyContent: "flex-end",
            fontSize: 15,
            fontWeight: 700,
            color: headerColor,
            textTransform: "uppercase",
          }}
        >
          Qtd
        </div>
        <div
          style={{
            display: "flex",
            width: 200,
            justifyContent: "flex-end",
            fontSize: 15,
            fontWeight: 700,
            color: headerColor,
            textTransform: "uppercase",
          }}
        >
          Valor
        </div>
      </div>
      {rows.map((row, index) => (
        <div
          key={row.categoryId ?? row.label}
          style={{
            display: "flex",
            padding: "13px 22px",
            borderTop: index === 0 ? "none" : `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flex: 1,
              fontSize: 19,
              fontWeight: 600,
              color: TEXT_DARK,
            }}
          >
            {row.label}
          </div>
          <div
            style={{
              display: "flex",
              width: 100,
              justifyContent: "flex-end",
              fontSize: 19,
              fontWeight: 600,
              color: TEXT_SECONDARY,
            }}
          >
            {row.count}
          </div>
          <div
            style={{
              display: "flex",
              width: 200,
              justifyContent: "flex-end",
              fontSize: 19,
              fontWeight: 700,
              color: TEXT_DARK,
            }}
          >
            {formatCurrencyBRL(row.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TotalBar({
  label,
  count,
  amount,
  color,
}: {
  label: string;
  count: number;
  amount: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: color,
        borderRadius: 20,
        padding: "15px 26px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 19,
          fontWeight: 800,
          color: "#FFFFFF",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 16,
          fontWeight: 600,
          color: "#FFFFFF",
          opacity: 0.85,
        }}
      >
        {count} lançamento{count === 1 ? "" : "s"}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          fontWeight: 900,
          color: "#FFFFFF",
        }}
      >
        {formatCurrencyBRL(amount)}
      </div>
    </div>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <div style={{ display: "flex", fontSize: 24, fontWeight: 800, color }}>
      {title}
    </div>
  );
}

/**
 * Renderiza o Status Report do Cofre como imagem 1080xN (`next/og`), N
 * calculado a partir do conteúdo real (`calculateImageHeight`) — nunca
 * mais um valor fixo. Estrutura fiel ao protótipo validado
 * (`prototipo-status-report-v2.html`): cabeçalho, período, Hero de
 * Saldo Final, 4 KPIs, e 3 tabelas (Dinheiro/PIX/Saídas) cada uma com
 * barra de total colorida.
 */
export async function renderStatusReportCofreImage(
  input: StatusReportCofreSummary,
): Promise<ArrayBuffer> {
  const logoDataUri = loadOrganizationLogoDataUri();
  const canvasHeight = calculateImageHeight(input);

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAGE_BG,
        fontFamily: "sans-serif",
        color: TEXT_DARK,
        padding: "26px 52px",
        gap: 13,
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoDataUri}
            width={152}
            height={95}
            alt={input.organizationName}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 800 }}>
              Clínica MAE
            </div>
            <div style={{ display: "flex", fontSize: 14, color: TEXT_MUTED }}>
              Diagnóstico e Tratamento em Gastroenterologia
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 800,
              color: BLUE,
              letterSpacing: 1,
            }}
          >
            STATUS REPORT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: TEXT_SECONDARY,
              maxWidth: 320,
              textAlign: "right",
            }}
          >
            Saldo do Cofre — consolidado Caixa Recepção + Cofre
          </div>
        </div>
      </div>

      <PeriodBox
        dateFrom={input.dateFrom}
        dateTo={input.dateTo}
        generatedAt={input.generatedAt}
      />

      <HeroCard finalBalance={input.finalBalance} isSurplus={input.isSurplus} />

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10 }}>
        <KpiCard
          label="Saldo Inicial"
          value={formatCurrencyBRL(input.openingBalance)}
          iconPath={ICON_PATHS.bank}
          iconColor={BLUE}
          iconBg={BLUE_LIGHT}
          valueColor={BLUE}
        />
        <KpiCard
          label="Entradas Dinheiro"
          value={formatCurrencyBRL(input.cashIncomeTotal)}
          iconPath={ICON_PATHS.wallet}
          iconColor={GREEN}
          iconBg={GREEN_LIGHT}
          valueColor={GREEN}
        />
        <KpiCard
          label="Entradas PIX"
          value={formatCurrencyBRL(input.pixIncomeTotal)}
          iconPath={ICON_PATHS.zap}
          iconColor={BLUE}
          iconBg={BLUE_LIGHT}
          valueColor={BLUE}
          note="enviado direto p/ conta bancária"
          dashedBorder={BLUE}
        />
        <KpiCard
          label="Saída Dinheiro"
          value={formatCurrencyBRL(input.cashOutcomeTotal)}
          iconPath={ICON_PATHS.arrowUp}
          iconColor={RED}
          iconBg={RED_LIGHT}
          valueColor={RED}
        />
      </div>

      {/* Entradas (Dinheiro) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionTitle title="Entradas (Dinheiro)" color={GREEN_DARK} />
        <CategoryTable
          rows={input.cashIncomeByCategory}
          headerBg={GREEN_LIGHT}
          headerColor={GREEN_DARK}
          rowBg={GREEN_ROW}
          borderColor={GREEN}
        />
        <TotalBar
          label="TOTAL DINHEIRO"
          count={input.cashIncomeCount}
          amount={input.cashIncomeTotal}
          color={GREEN}
        />
      </div>

      {/* Entradas (PIX) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionTitle
          title="Entradas (PIX) - Apenas informativo"
          color={BLUE_DARK}
        />
        <CategoryTable
          rows={input.pixIncomeByCategory}
          headerBg={BLUE_LIGHT}
          headerColor={BLUE_DARK}
          rowBg={BLUE_ROW}
          borderColor={BLUE}
          dashed
        />
        <TotalBar
          label="TOTAL PIX"
          count={input.pixIncomeCount}
          amount={input.pixIncomeTotal}
          color={BLUE}
        />
      </div>

      {/* Saídas (Dinheiro) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionTitle title="Saídas (Dinheiro)" color={RED} />
        <CategoryTable
          rows={input.cashOutcomeByCategory}
          headerBg={RED_LIGHT}
          headerColor={RED}
          rowBg={RED_ROW}
          borderColor={RED}
        />
        <TotalBar
          label="TOTAL SAÍDAS"
          count={input.cashOutcomeCount}
          amount={input.cashOutcomeTotal}
          color={RED}
        />
      </div>

      {/* Rodapé */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 20,
          borderTop: `1px solid ${BORDER}`,
          marginTop: 4,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 18,
            color: TEXT_MUTED,
          }}
        >
          <span>Relatório gerado pelo</span>
          <span style={{ color: BLUE, fontWeight: 700 }}>MedFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MedFlowIcon />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 800 }}>
              MedFlow
            </div>
            <div style={{ display: "flex", fontSize: 15, color: TEXT_MUTED }}>
              Gestão financeira inteligente para clínicas
            </div>
          </div>
        </div>
      </div>
    </div>,
    { width: CANVAS_WIDTH, height: canvasHeight },
  );

  return image.arrayBuffer();
}
