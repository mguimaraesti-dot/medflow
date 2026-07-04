import { CalendarClock } from "lucide-react";
import { formatCurrencyBRL, formatDateOnlyBR } from "@/shared/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export interface UpcomingDue {
  id: string;
  dueDate: string | Date;
  description: string;
  amount: string;
}

export function UpcomingDuesCard({ payables }: { payables: UpcomingDue[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos vencimentos</CardTitle>
      </CardHeader>
      <CardContent>
        {payables.length === 0 ? (
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <CalendarClock className="h-5 w-5 shrink-0" />
            <span>Nenhum vencimento nos próximos 7 dias.</span>
          </div>
        ) : (
          <ul className="space-y-3">
            {payables.map((payable) => (
              <li
                key={payable.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div>
                  <p>{payable.description}</p>
                  <p className="text-muted-foreground text-xs">
                    Vence em {formatDateOnlyBR(payable.dueDate)}
                  </p>
                </div>
                <span className="font-medium">
                  {formatCurrencyBRL(payable.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
