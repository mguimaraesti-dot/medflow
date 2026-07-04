import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

/**
 * US09 — "Próximos vencimentos" aparece como placeholder visual nesta
 * sprint; dado real (Contas a Pagar) só entra na Sprint 2. Não remover
 * como "dead code": faz parte do escopo aprovado da US09.
 */
export function UpcomingDuesPlaceholderCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximos vencimentos</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground flex items-center gap-3 text-sm">
        <CalendarClock className="h-5 w-5 shrink-0" />
        <span>Contas a Pagar chega na Sprint 2.</span>
      </CardContent>
    </Card>
  );
}
