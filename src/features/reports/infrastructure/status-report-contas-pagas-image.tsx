import { ImageResponse } from "next/og";
import {
  formatCurrencyBRL,
  formatDateOnlyBR,
  formatTimeBR,
} from "@/shared/lib/format";
import type { StatusReportContasPagasSummary } from "../domain/status-report-contas-pagas.entity";
import {
  BLUE,
  DARK_TEXT,
  MUTED_TEXT,
  BORDER,
  Icon,
  ICON_PATHS,
  MedFlowIcon,
  loadOrganizationLogoDataUri,
} from "./report-image-kit";

const PAGE_BG = "#F8FAFC";
const CARD_BG = "#FFFFFF";

/** Card branco padrão (borda 1px, raio 16px) — base de todo o layout, conforme diretrizes visuais do relatório. */
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
        borderRadius: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Título de seção com ícone — cabeçalho de cada `ChartCard`. */
function SectionTitle({
  title,
  iconPath,
}: {
  title: string;
  iconPath: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
      }}
    >
      <Icon path={iconPath} color={DARK_TEXT} size={26} />
      <div style={{ display: "flex", fontSize: 24, fontWeight: 800 }}>
        {title}
      </div>
    </div>
  );
}

/** `ReportCard` com um `SectionTitle` interno — usado pelas seções de gráfico (barras/rosca/semanas). */
function ChartCard({
  title,
  iconPath,
  children,
}: {
  title: string;
  iconPath: string;
  children: React.ReactNode;
}) {
  return (
    <ReportCard style={{ padding: "14px 32px" }}>
      <SectionTitle title={title} iconPath={iconPath} />
      {children}
    </ReportCard>
  );
}

/**
 * Seta desenhada à mão (não usa o glifo "▲"/"▼") — Satori tenta baixar
 * uma fonte dinâmica do Google Fonts pra glifos fora do fallback padrão,
 * o que falha sem rede e no melhor caso adiciona uma chamada de rede
 * evitável no meio da geração da imagem.
 */
function TrendArrow({ isUp }: { isUp: boolean }) {
  return (
    <Icon
      path={isUp ? "M12 19V5M6 11l6-6 6 6" : "M12 5v14M6 13l6 6 6-6"}
      color={MUTED_TEXT}
      size={12}
    />
  );
}

function TrendLine({
  current,
  previous,
}: {
  current: number;
  previous: number | null;
}) {
  if (previous === null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isUp = change >= 0;
  const formatted = Math.abs(change).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontSize: 13,
        color: MUTED_TEXT,
      }}
    >
      <TrendArrow isUp={isUp} />
      <span>{formatted}% vs período anterior</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  iconPath,
  trend,
}: {
  label: string;
  value: string;
  iconPath: string;
  trend?: React.ReactNode;
}) {
  return (
    <ReportCard
      style={{
        flex: 1,
        alignItems: "center",
        gap: 10,
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 56,
          height: 56,
          borderRadius: 999,
          backgroundColor: `${BLUE}1A`,
        }}
      >
        <Icon path={iconPath} color={BLUE} size={28} />
      </div>
      <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>
        {value}
      </div>
      {trend}
    </ReportCard>
  );
}

const DONUT_SIZE = 220;
const DONUT_RADIUS = 84;
const DONUT_STROKE = 34;
/** Rosca genérica — arcos desenhados via `<circle>`+`strokeDasharray` (Satori não roda libs de gráfico). Rótulos de percentual posicionados por trigonometria no ponto médio de cada fatia. */
function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = DONUT_SIZE,
  radius = DONUT_RADIUS,
  stroke = DONUT_STROKE,
  labelRadiusOffset = 0,
}: {
  segments: { amount: number; color: string; percentage: number }[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  radius?: number;
  stroke?: number;
  /** Empurra o rótulo de percentual pra fora do centro do traço — usado só na rosca grande (com texto central), pra não invadir a área do valor total. A rosca pequena (sem texto central) não precisa e não tem folga de sobra pra isso. */
  labelRadiusOffset?: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let cumulative = 0;
  const arcs = segments.map((segment, index) => {
    const fraction = segment.percentage / 100;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const dashOffset = -(cumulative * circumference);
    const midFraction = cumulative + fraction / 2;
    const angleRad = (midFraction * 360 - 90) * (Math.PI / 180);
    const labelRadius = radius + labelRadiusOffset;
    const labelX = center + labelRadius * Math.cos(angleRad);
    const labelY = center + labelRadius * Math.sin(angleRad);
    cumulative += fraction;
    return { ...segment, dash, gap, dashOffset, labelX, labelY, key: index };
  });

  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.dashOffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
      </svg>
      {arcs
        .filter((arc) => arc.percentage >= 5)
        .map((arc) => (
          <div
            key={`label-${arc.key}`}
            style={{
              display: "flex",
              position: "absolute",
              left: arc.labelX - 22,
              top: arc.labelY - 10,
              width: 44,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            {arc.percentage.toFixed(0)}%
          </div>
        ))}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: center - radius + stroke / 2,
          top: center - radius + stroke / 2,
          width: (radius - stroke / 2) * 2,
          height: (radius - stroke / 2) * 2,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 13, color: MUTED_TEXT }}>
          {centerLabel}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 800,
            color: DARK_TEXT,
            textAlign: "center",
          }}
        >
          {centerValue}
        </div>
      </div>
    </div>
  );
}

const BAR_TRACK_WIDTH = 420;
const AXIS_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/** Barra horizontal proporcional (0-100%) com bolinha colorida + nome à esquerda, valor + percentual à direita. */
function CategoryBarRow({
  color,
  label,
  amount,
  percentage,
}: {
  color: string;
  label: string;
  amount: string;
  percentage: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: 230,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 19,
            fontWeight: 600,
            color: DARK_TEXT,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          width: BAR_TRACK_WIDTH,
          height: 24,
          backgroundColor: "#F1F5F9",
          borderRadius: 999,
        }}
      >
        <div
          style={{
            display: "flex",
            width: Math.max((percentage / 100) * BAR_TRACK_WIDTH, 4),
            height: 24,
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          justifyContent: "flex-end",
          fontSize: 19,
          fontWeight: 700,
          color: DARK_TEXT,
        }}
      >
        {formatCurrencyBRL(amount)}
      </div>
      <div
        style={{
          display: "flex",
          width: 66,
          justifyContent: "flex-end",
          fontSize: 16,
          color: MUTED_TEXT,
        }}
      >
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

/** Eixo 0%–100% alinhado com a largura fixa das trilhas de `CategoryBarRow` (`230` do bloco nome + `BAR_TRACK_WIDTH` da trilha). */
function PercentAxis() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ display: "flex", width: 230 }} />
      <div
        style={{
          display: "flex",
          width: BAR_TRACK_WIDTH,
          justifyContent: "space-between",
        }}
      >
        {AXIS_TICKS.map((tick) => (
          <div
            key={tick}
            style={{ display: "flex", fontSize: 13, color: MUTED_TEXT }}
          >
            {tick}%
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flex: 1 }} />
      <div style={{ display: "flex", width: 66 }} />
    </div>
  );
}

function BeneficiaryRow({
  position,
  name,
  paymentsCount,
  amount,
}: {
  position: number;
  name: string;
  paymentsCount: number;
  amount: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "11px 0",
        borderTop: position === 1 ? "none" : `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: "#F1F5F9",
          fontSize: 17,
          fontWeight: 800,
          color: DARK_TEXT,
        }}
      >
        {position}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 42,
          height: 42,
          borderRadius: 999,
          backgroundColor: `${BLUE}1A`,
        }}
      >
        <Icon path={ICON_PATHS.user} color={BLUE} size={20} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            color: DARK_TEXT,
          }}
        >
          {name}
        </div>
        <div style={{ display: "flex", fontSize: 15, color: MUTED_TEXT }}>
          {paymentsCount} pagamento{paymentsCount === 1 ? "" : "s"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 800,
          color: DARK_TEXT,
        }}
      >
        {formatCurrencyBRL(amount)}
      </div>
    </div>
  );
}

const WEEK_CHART_HEIGHT = 110;

function WeeklyColumnChart({
  weeks,
}: {
  weeks: { label: string; amount: string }[];
}) {
  const max = Math.max(...weeks.map((week) => Number(week.amount)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
      {weeks.map((week) => {
        const heightPx = Math.max(
          (Number(week.amount) / max) * WEEK_CHART_HEIGHT,
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
                fontSize: 17,
                fontWeight: 700,
                color: DARK_TEXT,
              }}
            >
              {formatCurrencyBRL(week.amount)}
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
                  backgroundColor: BLUE,
                  borderRadius: 8,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 14,
                color: MUTED_TEXT,
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

function OriginBlock({
  label,
  color,
  count,
  amount,
  percentage,
  align,
}: {
  label: string;
  color: string;
  count: number;
  amount: string;
  percentage: number;
  align: "flex-start" | "flex-end";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        gap: 6,
        flex: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "flex",
            width: 14,
            height: 14,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
        <div style={{ display: "flex", fontSize: 20, fontWeight: 700 }}>
          {label}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>
        {formatCurrencyBRL(amount)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 16,
          color: MUTED_TEXT,
          gap: 6,
        }}
      >
        <span>
          {count} pagamento{count === 1 ? "" : "s"}
        </span>
        <span>•</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/**
 * Renderiza o Status Report: Contas Pagas como imagem 1080x1920
 * (`next/og`/Satori). Gráficos desenhados à mão (Opção A aprovada via
 * POC): rosca via `<circle>`+`strokeDasharray`, barras horizontais e
 * colunas verticais via retângulos de largura/altura proporcional.
 */
export async function renderStatusReportContasPagasImage(
  input: StatusReportContasPagasSummary,
): Promise<ArrayBuffer> {
  const logoDataUri = loadOrganizationLogoDataUri();
  const bancoOrigin = input.origins.find((o) => o.origin === "BANCO");
  const cofreOrigin = input.origins.find((o) => o.origin === "COFRE");

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: PAGE_BG,
        fontFamily: "sans-serif",
        color: DARK_TEXT,
        padding: "24px 52px",
        gap: 14,
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
            <div style={{ display: "flex", fontSize: 14, color: MUTED_TEXT }}>
              Gerado em
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 700 }}>
              {formatDateOnlyBR(input.generatedAt)} às{" "}
              {formatTimeBR(input.generatedAt)}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 800,
              color: BLUE,
            }}
          >
            RELATÓRIO DE CONTAS PAGAS
          </div>
          <div style={{ display: "flex", fontSize: 16, color: MUTED_TEXT }}>
            Período: {formatDateOnlyBR(input.dateFrom)} até{" "}
            {formatDateOnlyBR(input.dateTo)}
          </div>
        </div>
      </div>

      {/* Primeira linha — Total Pago / Contas Pagas */}
      <div style={{ display: "flex", gap: 14 }}>
        <KpiCard
          label="TOTAL PAGO"
          value={formatCurrencyBRL(input.totalPaid)}
          iconPath={ICON_PATHS.banknote}
          trend={
            <TrendLine
              current={Number(input.totalPaid)}
              previous={
                input.totalPaidPreviousPeriod === null
                  ? null
                  : Number(input.totalPaidPreviousPeriod)
              }
            />
          }
        />
        <KpiCard
          label="CONTAS PAGAS"
          value={String(input.paidCount)}
          iconPath={ICON_PATHS.fileText}
          trend={
            <TrendLine
              current={input.paidCount}
              previous={input.paidCountPreviousPeriod}
            />
          }
        />
      </div>

      {/* Card maior — Origem do Pagamento */}
      <ReportCard style={{ padding: "20px 36px" }}>
        <div
          style={{
            display: "flex",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          Origem do Pagamento
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {bancoOrigin && (
            <OriginBlock
              label={bancoOrigin.label}
              color={bancoOrigin.color}
              count={bancoOrigin.count}
              amount={bancoOrigin.amount}
              percentage={bancoOrigin.percentage}
              align="flex-start"
            />
          )}
          <DonutChart
            segments={input.origins.map((origin) => ({
              amount: Number(origin.amount),
              color: origin.color,
              percentage: origin.percentage,
            }))}
            centerLabel=""
            centerValue=""
            size={150}
            radius={58}
            stroke={24}
          />
          {cofreOrigin && (
            <OriginBlock
              label={cofreOrigin.label}
              color={cofreOrigin.color}
              count={cofreOrigin.count}
              amount={cofreOrigin.amount}
              percentage={cofreOrigin.percentage}
              align="flex-end"
            />
          )}
        </div>
      </ReportCard>

      {/* Onde o dinheiro foi gasto */}
      <ChartCard
        title="Onde o dinheiro foi gasto"
        iconPath={ICON_PATHS.barChart}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {input.categories.map((category) => (
            <CategoryBarRow
              key={category.categoryId ?? "outros"}
              color={category.color}
              label={category.label}
              amount={category.amount}
              percentage={category.percentage}
            />
          ))}
          <PercentAxis />
        </div>
      </ChartCard>

      {/* Top 5 Beneficiários */}
      <ChartCard title="Top 5 Beneficiários" iconPath={ICON_PATHS.medal}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {input.topBeneficiaries.map((beneficiary, index) => (
            <BeneficiaryRow
              key={beneficiary.supplierId}
              position={index + 1}
              name={beneficiary.name}
              paymentsCount={beneficiary.paymentsCount}
              amount={beneficiary.amount}
            />
          ))}
        </div>
      </ChartCard>

      {/* Pagamentos por Semana */}
      <ChartCard title="Pagamentos por Semana" iconPath={ICON_PATHS.calendar}>
        <WeeklyColumnChart weeks={input.weeks} />
      </ChartCard>

      {/* Rodapé */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 28,
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
            color: MUTED_TEXT,
          }}
        >
          <span>Relatório gerado automaticamente pelo</span>
          <span style={{ color: BLUE, fontWeight: 700 }}>MedFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MedFlowIcon />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 800 }}>
              MedFlow
            </div>
            <div style={{ display: "flex", fontSize: 15, color: MUTED_TEXT }}>
              Gestão financeira inteligente para clínicas
            </div>
          </div>
        </div>
      </div>
    </div>,
    { width: 1080, height: 1920 },
  );

  return image.arrayBuffer();
}
