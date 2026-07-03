import { describe, it, expect, vi } from "vitest";
import { listPaymentMethodsUseCase } from "@/features/payment-methods/application/list-payment-methods.use-case";
import type { PaymentMethodRepository } from "@/features/payment-methods/domain/payment-method.repository";
import type { PaymentMethod } from "@/features/payment-methods/domain/payment-method.entity";

describe("listPaymentMethodsUseCase", () => {
  it("delega ao repositório com o organizationId", async () => {
    const paymentMethods: PaymentMethod[] = [
      {
        id: "pm-1",
        organizationId: "org-1",
        name: "PIX",
        displayOrder: 1,
        active: true,
      },
    ];
    const listActive = vi.fn().mockResolvedValue(paymentMethods);
    const paymentMethodRepository = {
      listActive,
    } as unknown as PaymentMethodRepository;

    const result = await listPaymentMethodsUseCase("org-1", {
      paymentMethodRepository,
    });

    expect(listActive).toHaveBeenCalledWith("org-1");
    expect(result).toBe(paymentMethods);
  });
});
