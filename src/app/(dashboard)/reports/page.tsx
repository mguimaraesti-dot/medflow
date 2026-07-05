import { ReportsTabs } from "./reports-tabs";

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">
          Fechamento diário e despesas por categoria.
        </p>
      </div>
      <ReportsTabs />
    </div>
  );
}
