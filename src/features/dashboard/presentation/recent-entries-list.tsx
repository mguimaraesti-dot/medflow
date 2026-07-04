import { formatCurrencyBRL, formatDateTimeBR } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { CashFlowEntryResponseDTO } from "@/features/cash-flow/application/dtos/cash-flow-entry.response-dto";

export function RecentEntriesList({
  entries,
}: {
  entries: CashFlowEntryResponseDTO[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Últimos lançamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhum lançamento ainda.
          </p>
        )}
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant={entry.type === "IN" ? "default" : "destructive"}
                >
                  {entry.type === "IN" ? "Entrada" : "Saída"}
                </Badge>
                <span className="text-muted-foreground">
                  {entry.description ?? "—"}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium">
                  {formatCurrencyBRL(entry.amount)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatDateTimeBR(entry.occurredAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
