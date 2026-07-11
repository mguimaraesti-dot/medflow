import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import type { StatusReportSummary } from "../domain/status-report.entity";

const BLUE = "#2563EB";
const GREEN = "#16A34A";
const RED = "#EF4444";
const LIGHT_GRAY = "#F3F4F6";
const DARK_TEXT = "#1F2937";
const MUTED_TEXT = "#6B7280";
const BORDER = "#E5E7EB";
const GREEN_BG = "#ECFDF5";

/**
 * Logo da Clínica MAE (único cliente do MVP hoje — CLAUDE.md) embutido
 * como asset estático da feature. Se o MedFlow virar multiempresa de
 * verdade, isso precisa virar um upload por organização; por ora, um
 * arquivo fixo é a solução certa pro escopo atual.
 */
let cachedLogoDataUri: string | null = null;
function loadOrganizationLogoDataUri(): string {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const filePath = join(
    process.cwd(),
    "src/features/reports/infrastructure/assets/clinica-mae-logo.jpeg",
  );
  const base64 = readFileSync(filePath).toString("base64");
  cachedLogoDataUri = `data:image/jpeg;base64,${base64}`;
  return cachedLogoDataUri;
}

/** Ícones em linha (stroke, sem preenchimento) — satori (`next/og`) só suporta um subconjunto de SVG, então cada um é desenhado à mão em vez de reaproveitar o lucide-react. */
function Icon({
  path,
  color,
  size = 20,
}: {
  path: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

const ICON_PATHS = {
  calendar:
    "M8 2v4M16 2v4M3.5 9h17M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  clock: "M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  wallet:
    "M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z M16 14h.01",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  arrowUp: "M12 19V5M6 11l6-6 6 6",
  barChart: "M4 20V10M12 20V4M20 20v-6",
  trendingUp: "M4 17l6-6 4 4 7-8M15 6h6v6",
  trendingDown: "M4 7l6 6 4-4 7 8M21 11v6h-6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 4-6 8-6s8 2 8 6",
  shield: "M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6Z M9.5 12l1.7 1.7 3.3-3.4",
  receipt: "M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z M9 8h6M9 12h6",
  zap: "M13 2 4 14h6l-1 8 9-12h-6z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  sliders: "M4 6h6M14 6h6M4 12h10M18 12h2M4 18h4M12 18h8",
};

function MedFlowIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="18" width="7" height="12" rx="2.5" fill="#60A5FA" />
      <rect x="12.5" y="10" width="7" height="20" rx="2.5" fill="#2563EB" />
      <rect x="23" y="2" width="7" height="28" rx="2.5" fill="#1E3A8A" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  color,
  iconPath,
  highlighted,
}: {
  label: string;
  value: string;
  color: string;
  iconPath: string;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        flex: 1,
        position: "relative",
        backgroundColor: highlighted ? GREEN_BG : "#FFFFFF",
        border: `1px solid ${highlighted ? GREEN : BORDER}`,
        borderRadius: 16,
        padding: "32px 12px",
      }}
    >
      {highlighted && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -16,
            right: 8,
            backgroundColor: GREEN,
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 999,
          }}
        >
          RESULTADO DO PERÍODO
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: 999,
          backgroundColor: `${color}1A`,
        }}
      >
        <Icon path={iconPath} color={color} size={26} />
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          fontWeight: 700,
          color: MUTED_TEXT,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: highlighted ? 40 : 33,
          fontWeight: 800,
          color,
        }}
      >
        {formatCurrencyBRL(value)}
      </div>
    </div>
  );
}

function CategoryRow({
  iconPath,
  label,
  income,
  expense,
  isTotal,
}: {
  iconPath: string;
  label: string;
  income: string | null;
  expense: string | null;
  isTotal?: boolean;
}) {
  const balance =
    income !== null || expense !== null
      ? (Number(income ?? 0) - Number(expense ?? 0)).toFixed(2)
      : null;
  const balanceColor = balance !== null && Number(balance) < 0 ? RED : GREEN;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "24px 32px",
        borderTop: isTotal ? `2px solid ${DARK_TEXT}` : `1px solid ${BORDER}`,
        backgroundColor: isTotal ? LIGHT_GRAY : "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flex: 2,
          minWidth: 0,
        }}
      >
        {!isTotal && <Icon path={iconPath} color={MUTED_TEXT} size={24} />}
        <div
          style={{
            display: "flex",
            fontSize: 27,
            fontWeight: isTotal ? 800 : 600,
            color: DARK_TEXT,
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: isTotal ? 800 : 600,
          color: income !== null ? GREEN : MUTED_TEXT,
        }}
      >
        {income !== null ? formatCurrencyBRL(income) : "–"}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: isTotal ? 800 : 600,
          color: expense !== null ? RED : MUTED_TEXT,
        }}
      >
        {expense !== null ? formatCurrencyBRL(expense) : "–"}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1.2,
          justifyContent: "flex-end",
          fontSize: 24,
          fontWeight: 800,
          color: balance !== null ? balanceColor : MUTED_TEXT,
        }}
      >
        {balance !== null ? formatCurrencyBRL(balance) : "–"}
      </div>
    </div>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  RECEPCAO: ICON_PATHS.user,
  CONVENIOS: ICON_PATHS.shield,
  PARTICULAR: ICON_PATHS.user,
  CONTAS_A_PAGAR: ICON_PATHS.receipt,
  DESPESAS_OPERACIONAIS: ICON_PATHS.zap,
  SALARIOS: ICON_PATHS.users,
  AJUSTES: ICON_PATHS.sliders,
};

/**
 * Renderiza o Status Report como imagem 1080x1920 (`next/og`/satori) —
 * layout fixo seguindo a especificação visual aprovada. Sem fonte
 * Poppins embutida (satori cairia pra fallback silencioso sem o
 * arquivo de fonte); usa a sans-serif padrão do satori, mantendo
 * pesos/tamanhos análogos. Fontes deliberadamente grandes (a imagem é
 * feita pra ser vista em tela de celular, não em monitor).
 */
export async function renderStatusReportImage(
  input: StatusReportSummary,
): Promise<ArrayBuffer> {
  const superavit = Number(input.closingBalance) - Number(input.openingBalance);
  const isSuperavit = superavit >= 0;
  const logoDataUri = loadOrganizationLogoDataUri();

  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        fontFamily: "sans-serif",
        color: DARK_TEXT,
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "48px 56px 28px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoDataUri}
          width={176}
          height={110}
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
              fontSize: 40,
              fontWeight: 800,
              color: BLUE,
            }}
          >
            STATUS REPORT
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED_TEXT }}>
            Relatório Financeiro do Período
          </div>
        </div>
      </div>

      {/* Informações do período */}
      <div style={{ display: "flex", padding: "0 56px 28px" }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            backgroundColor: "#F8FAFC",
            borderRadius: 16,
            padding: "30px 32px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon path={ICON_PATHS.calendar} color={BLUE} size={26} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
                Período
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                {formatDateOnlyBR(input.dateFrom)} a{" "}
                {formatDateOnlyBR(input.dateTo)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Icon path={ICON_PATHS.clock} color={BLUE} size={26} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
                Emitido em
              </div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>
                {formatDateOnlyBR(input.generatedAt)} às{" "}
                {String(input.generatedAt.getUTCHours()).padStart(2, "0")}:
                {String(input.generatedAt.getUTCMinutes()).padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores principais */}
      <div style={{ display: "flex", gap: 20, padding: "8px 56px 36px" }}>
        <KpiCard
          label="SALDO INICIAL"
          value={input.openingBalance}
          color={BLUE}
          iconPath={ICON_PATHS.wallet}
        />
        <KpiCard
          label="ENTRADAS"
          value={input.totalIn}
          color={GREEN}
          iconPath={ICON_PATHS.arrowDown}
        />
        <KpiCard
          label="SAÍDAS"
          value={input.totalOut}
          color={RED}
          iconPath={ICON_PATHS.arrowUp}
        />
        <KpiCard
          label="SALDO FINAL"
          value={input.closingBalance}
          color={GREEN}
          iconPath={ICON_PATHS.wallet}
          highlighted
        />
      </div>

      {/* Resumo por categoria */}
      <div
        style={{ display: "flex", flexDirection: "column", padding: "0 56px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <Icon path={ICON_PATHS.barChart} color={DARK_TEXT} size={30} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>
            RESUMO POR CATEGORIA
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${BORDER}`,
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#F8FAFC",
              padding: "16px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                flex: 2,
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              CATEGORIA
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              ENTRADAS
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              SAÍDAS
            </div>
            <div
              style={{
                display: "flex",
                flex: 1.2,
                justifyContent: "flex-end",
                fontSize: 18,
                fontWeight: 700,
                color: MUTED_TEXT,
              }}
            >
              SALDO
            </div>
          </div>
          {input.categories.map((category) => (
            <CategoryRow
              key={category.code}
              iconPath={CATEGORY_ICONS[category.code]}
              label={category.label}
              income={category.income}
              expense={category.expense}
            />
          ))}
          <CategoryRow
            iconPath=""
            label="TOTAL"
            income={sumColumn(input.categories, "income")}
            expense={sumColumn(input.categories, "expense")}
            isTotal
          />
        </div>
      </div>

      {/* Card de resultado final */}
      <div style={{ display: "flex", padding: "32px 56px 0" }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: GREEN_BG,
            border: `1px solid ${GREEN}`,
            borderRadius: 16,
            padding: "36px 40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 999,
                backgroundColor: `${GREEN}26`,
              }}
            >
              <Icon
                path={
                  isSuperavit ? ICON_PATHS.trendingUp : ICON_PATHS.trendingDown
                }
                color={GREEN}
                size={38}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  fontWeight: 700,
                  color: MUTED_TEXT,
                }}
              >
                SALDO FINAL DO PERÍODO
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 46,
                  fontWeight: 800,
                  color: GREEN,
                }}
              >
                {formatCurrencyBRL(input.closingBalance)}
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
            <div style={{ display: "flex", fontSize: 20, color: MUTED_TEXT }}>
              {isSuperavit ? "Superávit de" : "Déficit de"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 32,
                fontWeight: 800,
                color: isSuperavit ? GREEN : RED,
              }}
            >
              {formatCurrencyBRL(Math.abs(superavit).toFixed(2))}
            </div>
            <div style={{ display: "flex", fontSize: 18, color: MUTED_TEXT }}>
              em relação ao saldo inicial.
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé — sem flex:1/justify-end: com as fontes maiores o
            conteúdo já ocupa quase toda a tela, então o rodapé só
            precisa vir logo em seguida, não ser empurrado pro fundo. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 56px 40px",
          borderTop: `1px solid ${BORDER}`,
          marginTop: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontSize: 20,
            color: MUTED_TEXT,
          }}
        >
          <span>Relatório gerado pelo</span>
          <span style={{ color: BLUE, fontWeight: 700 }}>MedFlow</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MedFlowIcon />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 800 }}>
              MedFlow
            </div>
            <div style={{ display: "flex", fontSize: 16, color: MUTED_TEXT }}>
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

function sumColumn(
  categories: StatusReportSummary["categories"],
  column: "income" | "expense",
): string {
  return categories
    .reduce((total, category) => total + Number(category[column] ?? 0), 0)
    .toFixed(2);
}
