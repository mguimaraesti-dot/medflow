import type { PaymentMethodRepository } from "../domain/payment-method.repository";
import type { PaymentMethod } from "../domain/payment-method.entity";

interface Deps {
  paymentMethodRepository: PaymentMethodRepository;
}

export async function listPaymentMethodsUseCase(
  organizationId: string,
  deps: Deps,
): Promise<PaymentMethod[]> {
  return deps.paymentMethodRepository.listActive(organizationId);
}
