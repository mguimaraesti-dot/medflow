import { ImageResponse } from "next/og";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatTimeBR,
} from "@/shared/lib/format";
import type {
  StatusReportSafeCompositionRow,
  StatusReportSafeSummary,
  StatusReportSafeWeek,
} from "../domain/status-report-safe.entity";
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

// Alturas aproximadas (px) de cada bloco de altura fixa — mesmo método
// de `status-report-cofre-image.tsx` (nenhuma é exata, só suficiente
// pra nunca subestimar; sobrar espaço no rodapé é preferível a cortar
// conteúdo, já que o Satori não tem scroll nem auto-altura).
const HEADER_HEIGHT = 100;
const PERIOD_BOX_HEIGHT = 90;
const HERO_HEIGHT = 260;
const WATERFALL_SECTION_HEIGHT = 330;
const WEEKLY_SECTION_HEIGHT = 250;
const COMPOSITION_HEADER_HEIGHT = 56;
const COMPOSITION_ROW_HEIGHT = 92;
const COMPOSITION_ROW_COUNT = 4;
const PENDING_NOTE_HEIGHT = 130;
const FOOTER_HEIGHT = 100;
const OUTER_VERTICAL_PADDING = 52; // "26px 52px" no container raiz
const OUTER_GAP = 13;
const SAFETY_MARGIN = 100;

/**
 * Altura do canvas a partir do conteúdo real — mesma técnica de
 * `status-report-cofre-image.tsx`/`status-report-contas-pagas-image.tsx`.
 * A nota de "aguardando conferência" só entra na conta quando existe
 * (pendingCount > 0); as demais seções têm contagem de linha fixa
 * (composição sempre 4 linhas, gráfico semanal sempre altura fixa —
 * só a LARGURA das colunas varia com o número de semanas).
 */
function calculateImageHeight(input: StatusReportSafeSummary): number {
  const hasPendingNote = input.pendingCount > 0;
  const sectionCount = hasPendingNote ? 8 : 7; // cabeçalho, período, hero, waterfall, semanal, composição, (pendente), rodapé

  const fixedHeight =
    OUTER_VERTICAL_PADDING +
    OUTER_GAP * (sectionCount - 1) +
    HEADER_HEIGHT +
    PERIOD_BOX_HEIGHT +
    HERO_HEIGHT +
    WATERFALL_SECTION_HEIGHT +
    WEEKLY_SECTION_HEIGHT +
    COMPOSITION_HEADER_HEIGHT +
    COMPOSITION_ROW_HEIGHT * COMPOSITION_ROW_COUNT +
    (hasPendingNote ? PENDING_NOTE_HEIGHT : 0) +
    FOOTER_HEIGHT;

  return Math.max(MIN_CANVAS_HEIGHT, fixedHeight + SAFETY_MARGIN);
}

/** Paleta — segue o brand kit oficial do MedFlow (ver protótipo `prototipo-relatorio-executivo-cofre-v2.html`). */
const PAGE_BG = "#F8F8F6";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#0F172A";
const TEXT_MUTED = "#64748B";
const TEXT_SECONDARY = "#475569";

const NAVY = "#1E3A8A"; // --secundaria do brand kit — cor do Hero (posição, não fluxo: nunca verde/vermelho aqui)
const GREEN = "#16A34A";
const GREEN_LIGHT = "#DCFCE7";
const GREEN_DARK = "#15803D";
const RED = "#DC2626";
const RED_LIGHT = "#FEE2E2";
const AMBER = "#B45309";
const AMBER_LIGHT = "#FFFBEB";
const AMBER_BORDER = "#FCD34D";
const BLUE_LIGHT = "#DBEAFE";
const SLATE = "#CBD5E1";

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

/**
 * Hero em azul-marinho (`NAVY`, `#1E3A8A` do brand kit) — nunca
 * verde/vermelho aqui: o Hero mostra uma POSIÇÃO (saldo), não um
 * FLUXO. Verde no MedFlow significa "dinheiro entrando" (convenção já
 * usada em Entradas/Saídas); usar verde num saldo afirmaria "é bom",
 * o que nem sempre é verdade (saldo alto pode ser ocioso, saldo baixo
 * pode ser saudável). O delta (badge) é o único lugar com cor
 * direcional, porque ali sim é uma variação no período.
 */
function HeroCard({
  finalBalance,
  periodReceived,
  periodSent,
}: {
  finalBalance: string;
  periodReceived: string;
  periodSent: string;
}) {
  const delta = Number(periodReceived) - Number(periodSent);
  const isPositiveDelta = delta >= 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: NAVY,
        borderRadius: 36,
        padding: "28px 36px",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 20,
          fontWeight: 700,
          color: "#FFFFFF",
          opacity: 0.75,
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}
      >
        Saldo do Cofre
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 84,
          fontWeight: 900,
          color: "#FFFFFF",
        }}
      >
        {formatCurrencyBRL(finalBalance)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: "rgba(255,255,255,0.16)",
          color: isPositiveDelta ? "#BBF7D0" : "#FECACA",
          fontSize: 19,
          fontWeight: 700,
          padding: "7px 16px",
          borderRadius: 999,
          alignSelf: "flex-start",
        }}
      >
        <Icon
          path={isPositiveDelta ? ICON_PATHS.arrowUp : ICON_PATHS.arrowDown}
          color={isPositiveDelta ? "#BBF7D0" : "#FECACA"}
          size={16}
        />
        {formatCurrencyBRL(String(Math.abs(delta)))} no período
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          color: "#FFFFFF",
          opacity: 0.7,
        }}
      >
        Dinheiro guardado no cofre da tesouraria
      </div>
    </div>
  );
}

const WATERFALL_CHART_HEIGHT = 190;

function WaterfallColumn({
  label,
  sublabel,
  bottomPx,
  heightPx,
  color,
  valueLabel,
  valueColor,
}: {
  label: string;
  sublabel: string;
  bottomPx: number;
  heightPx: number;
  color: string;
  valueLabel: string;
  valueColor: string;
}) {
  const topGapPx = Math.max(WATERFALL_CHART_HEIGHT - bottomPx - heightPx, 0);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        flex: 1,
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 17,
          fontWeight: 700,
          color: valueColor,
        }}
      >
        {valueLabel}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "70%",
          height: WATERFALL_CHART_HEIGHT,
        }}
      >
        <div style={{ display: "flex", height: topGapPx }} />
        <div
          style={{
            display: "flex",
            width: "100%",
            height: Math.max(heightPx, 6),
            backgroundColor: color,
            borderRadius: 6,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 15,
            fontWeight: 700,
            color: TEXT_DARK,
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 13,
            color: TEXT_MUTED,
            textAlign: "center",
          }}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
}

/**
 * "Como o saldo chegou até aqui" — waterfall de 4 colunas (Saldo
 * inicial / Recebido do caixa / Enviado ao caixa / Saldo final).
 * Satori não tem Canvas/D3 — barras "flutuantes" são simuladas com um
 * espaçador invisível (`topGapPx`) acima da barra colorida dentro de
 * um container de altura fixa, mesma técnica de posicionamento usada
 * pelo `WeeklyColumnChart` de `status-report-contas-pagas-image.tsx`,
 * só que aqui com um espaçador adicional pra "flutuar" a barra.
 */
function WaterfallChart({
  dateFrom,
  dateTo,
  openingBalance,
  periodReceived,
  periodSent,
  finalBalance,
}: {
  dateFrom: Date;
  dateTo: Date;
  openingBalance: string;
  periodReceived: string;
  periodSent: string;
  finalBalance: string;
}) {
  const opening = Number(openingBalance);
  const received = Number(periodReceived);
  const sent = Number(periodSent);
  const final = Number(finalBalance);

  const max = Math.max(opening, opening + received, final, 1);
  const scale = WATERFALL_CHART_HEIGHT / max;

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 0 }}>
      <WaterfallColumn
        label="Saldo inicial"
        sublabel={formatDateOnlyBR(dateFrom)}
        bottomPx={0}
        heightPx={opening * scale}
        color={SLATE}
        valueLabel={formatCurrencyBRL(openingBalance)}
        valueColor={TEXT_DARK}
      />
      <WaterfallColumn
        label="Recebido do caixa"
        sublabel="fechamentos e retiradas"
        bottomPx={opening * scale}
        heightPx={received * scale}
        color={GREEN}
        valueLabel={`+ ${formatCurrencyBRL(periodReceived)}`}
        valueColor={GREEN_DARK}
      />
      <WaterfallColumn
        label="Enviado ao caixa"
        sublabel="fundos e pagamentos"
        bottomPx={final * scale}
        heightPx={sent * scale}
        color={RED}
        valueLabel={`− ${formatCurrencyBRL(periodSent)}`}
        valueColor={RED}
      />
      <WaterfallColumn
        label="Saldo final"
        sublabel={formatDateOnlyBR(dateTo)}
        bottomPx={0}
        heightPx={final * scale}
        color={NAVY}
        valueLabel={formatCurrencyBRL(finalBalance)}
        valueColor={NAVY}
      />
    </div>
  );
}

const WEEK_CHART_HEIGHT = 120;

/**
 * "Saldo dia a dia" (Opção B — semanal, escolhida em vez da diária):
 * poucas barras, todas rotuladas com folga. Mostra POSIÇÃO (saldo ao
 * fim de cada semana), não fluxo — por isso cor única (não
 * verde/vermelho por semana).
 */
function WeeklyBalanceChart({ weeks }: { weeks: StatusReportSafeWeek[] }) {
  const max = Math.max(...weeks.map((week) => Number(week.balance)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
      {weeks.map((week) => {
        const heightPx = Math.max(
          (Number(week.balance) / max) * WEEK_CHART_HEIGHT,
          6,
        );
        return (
          <div
            key={week.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {formatCurrencyBRL(week.balance)}
            </div>
            <div
              style={{
                display: "flex",
                width: "100%",
                height: WEEK_CHART_HEIGHT,
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: heightPx,
                  background: `linear-gradient(180deg, ${BLUE}, ${NAVY})`,
                  borderRadius: "6px 6px 0 0",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 13,
                color: TEXT_MUTED,
                textAlign: "center",
              }}
            >
              {week.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const COMPOSITION_ICON: Record<
  string,
  { path: string; color: string; bg: string }
> = {
  "Recebido do caixa": {
    path: ICON_PATHS.arrowDown,
    color: GREEN,
    bg: GREEN_LIGHT,
  },
  "Enviado ao caixa": { path: ICON_PATHS.arrowUp, color: RED, bg: RED_LIGHT },
  "Pago a fornecedores": { path: ICON_PATHS.bank, color: BLUE, bg: BLUE_LIGHT },
  "Ajustes manuais": {
    path: ICON_PATHS.sliders,
    color: AMBER,
    bg: AMBER_LIGHT,
  },
};

function CompositionRow({
  row,
  maxAbsAmount,
  isFirst,
}: {
  row: StatusReportSafeCompositionRow;
  maxAbsAmount: number;
  isFirst: boolean;
}) {
  const amount = Number(row.amount);
  const icon = COMPOSITION_ICON[row.label];
  const barWidthPercent =
    maxAbsAmount > 0 ? (Math.abs(amount) / maxAbsAmount) * 100 : 0;
  const valueColor = amount > 0 ? GREEN_DARK : amount < 0 ? RED : TEXT_MUTED;
  const barColor = amount > 0 ? GREEN : amount < 0 ? RED : SLATE;
  const signPrefix = amount > 0 ? "+ " : amount < 0 ? "− " : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 0",
        borderTop: isFirst ? "none" : `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: icon.bg,
          flexShrink: 0,
        }}
      >
        <Icon path={icon.path} color={icon.color} size={20} />
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", flex: 1, gap: 2 }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 19,
            fontWeight: 600,
            color: TEXT_DARK,
          }}
        >
          {row.label}
        </div>
        <div style={{ display: "flex", fontSize: 14, color: TEXT_MUTED }}>
          {row.description}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: 180,
          height: 8,
          backgroundColor: "#F1F3F7",
          borderRadius: 999,
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${barWidthPercent}%`,
            height: "100%",
            backgroundColor: barColor,
            borderRadius: 999,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          width: 190,
          justifyContent: "flex-end",
          fontSize: 20,
          fontWeight: 700,
          color: valueColor,
        }}
      >
        {amount === 0
          ? formatCurrencyBRL(row.amount)
          : `${signPrefix}${formatCurrencyBRL(String(Math.abs(amount)))}`}
      </div>
    </div>
  );
}

function PendingConferenceNote({
  pendingCount,
  pendingSum,
  finalBalance,
}: {
  pendingCount: number;
  pendingSum: string;
  finalBalance: string;
}) {
  const projectedBalance = (Number(finalBalance) + Number(pendingSum)).toFixed(
    2,
  );
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
        backgroundColor: AMBER_LIGHT,
        border: `1px solid ${AMBER_BORDER}`,
        borderRadius: 20,
        padding: "20px 26px",
      }}
    >
      <Icon path={ICON_PATHS.clock} color={AMBER} size={24} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            fontSize: 19,
            fontWeight: 700,
            color: AMBER,
          }}
        >
          {formatCurrencyBRL(pendingSum)} aguardando conferência
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            color: "#92400E",
            maxWidth: 900,
          }}
        >
          {pendingCount} fechamento{pendingCount === 1 ? "" : "s"} de caixa
          ainda não{" "}
          {pendingCount === 1 ? "foi confirmado" : "foram confirmados"} por um
          gerente e por isso não {pendingCount === 1 ? "entra" : "entram"} no
          saldo acima. Confirmado
          {pendingCount === 1 ? "" : "s"}, o cofre passa a{" "}
          {formatCurrencyBRL(projectedBalance)}.
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <div
        style={{ display: "flex", fontSize: 24, fontWeight: 800, color: NAVY }}
      >
        {title}
      </div>
      {count && (
        <div style={{ display: "flex", fontSize: 16, color: TEXT_MUTED }}>
          {count}
        </div>
      )}
    </div>
  );
}

/**
 * Renderiza o Relatório Executivo do Cofre como imagem 1080xN
 * (`next/og`), N calculado a partir do conteúdo real
 * (`calculateImageHeight`). Estrutura fiel ao protótipo validado
 * (`prototipo-relatorio-executivo-cofre-v2.html`): cabeçalho, período,
 * Hero de Saldo (azul-marinho, nunca verde/vermelho — é posição, não
 * fluxo), waterfall "como chegamos até aqui", gráfico semanal "saldo
 * dia a dia" (Opção B, escolhida em vez da diária), composição por
 * tipo de movimentação, e nota de conferência pendente (só quando
 * existe).
 */
export async function renderStatusReportSafeImage(
  input: StatusReportSafeSummary,
): Promise<ArrayBuffer> {
  const logoDataUri = loadOrganizationLogoDataUri();
  const canvasHeight = calculateImageHeight(input);
  const totalMovements = input.composition.reduce(
    (sum, row) => sum + row.count,
    0,
  );
  const maxAbsAmount = Math.max(
    ...input.composition.map((row) => Math.abs(Number(row.amount))),
    1,
  );

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          width={152}
          height={95}
          alt={input.organizationName}
        />
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
            RELATÓRIO EXECUTIVO DO COFRE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: TEXT_SECONDARY,
              maxWidth: 380,
              textAlign: "right",
            }}
          >
            Posição e movimentação do dinheiro em espécie
          </div>
        </div>
      </div>

      <PeriodBox
        dateFrom={input.dateFrom}
        dateTo={input.dateTo}
        generatedAt={input.generatedAt}
      />

      <HeroCard
        finalBalance={input.finalBalance}
        periodReceived={input.periodReceived}
        periodSent={input.periodSent}
      />

      {/* Waterfall */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle title="Como o saldo chegou até aqui" count="no período" />
        <ReportCard style={{ padding: "26px 24px 16px" }}>
          <WaterfallChart
            dateFrom={input.dateFrom}
            dateTo={input.dateTo}
            openingBalance={input.openingBalance}
            periodReceived={input.periodReceived}
            periodSent={input.periodSent}
            finalBalance={input.finalBalance}
          />
        </ReportCard>
      </div>

      {/* Semanal */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle title="Saldo dia a dia" count="fim de cada semana" />
        <ReportCard style={{ padding: "24px 24px 14px" }}>
          <WeeklyBalanceChart weeks={input.weeks} />
        </ReportCard>
      </div>

      {/* Composição */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle
          title="O que entrou e o que saiu"
          count={`${totalMovements} movimentaç${totalMovements === 1 ? "ão" : "ões"}`}
        />
        <ReportCard style={{ padding: "4px 24px" }}>
          {input.composition.map((row, index) => (
            <CompositionRow
              key={row.label}
              row={row}
              maxAbsAmount={maxAbsAmount}
              isFirst={index === 0}
            />
          ))}
        </ReportCard>
      </div>

      {input.pendingCount > 0 && (
        <PendingConferenceNote
          pendingCount={input.pendingCount}
          pendingSum={input.pendingSum}
          finalBalance={input.finalBalance}
        />
      )}

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
