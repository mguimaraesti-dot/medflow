import type { PaymentMethod } from "./payment-method.entity";

export interface PaymentMethodRepository {
  /** Lista formas de pagamento ativas da organização, ordenadas por displayOrder. */
  listActive(organizationId: string): Promise<PaymentMethod[]>;
}
