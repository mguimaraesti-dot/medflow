import { z } from "zod";
import {
  cuidSchema,
  moneyAmountSchema,
  dateOnlySchema,
  shortTextSchema,
} from "@/shared/lib/validators";

/**
 * `amount` editável só enquanto a conta está PENDENTE (o use case bloqueia
 * fora disso — `PayableAlreadyProcessedError`); nunca propagado em lote pra
 * série (`UpdateManyForSeriesInput`), mesmo tratamento já dado a `dueDate`,
 * já que cada ocorrência pode ter um valor diferente. `scope` só importa
 * quando a conta pertence a uma recorrência: "SINGLE" altera só esta
 * ocorrência, "SERIES" propaga fornecedor/categoria/observação pras
 * próximas ocorrências PENDENTES (o vencimento e o valor de cada uma
 * continuam os seus, nunca sobrescritos em lote). `barcode`/`pixKey`
 * editáveis a partir de agora, pra completar/corrigir dados de pagamento
 * depois do cadastro inicial — `qrCodeUrl` continua sem UI de edição (só
 * exibição).
 */
export const updateAccountsPayableSchema = z.object({
  supplierId: cuidSchema,
  categoryId: cuidSchema,
  description: z.string().trim().min(1, "Informe a descrição").max(200),
  amount: moneyAmountSchema,
  dueDate: dateOnlySchema,
  paymentOrigin: z.enum(["BANCO", "COFRE"]),
  barcode: shortTextSchema(100),
  pixKey: shortTextSchema(200),
  scope: z.enum(["SINGLE", "SERIES"]).default("SINGLE"),
  /** Dias antes do vencimento em que o lembrete de WhatsApp começa a ser enviado. */
  reminderDaysBefore: z.number().int().min(0).max(60),
});

export type UpdateAccountsPayableInput = z.infer<
  typeof updateAccountsPayableSchema
>;
