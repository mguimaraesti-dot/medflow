"use client";

import { getPaymentMethodIcon } from "@/shared/lib/lucide-icon-map";
import { cn } from "@/shared/lib/utils";
import type { PaymentMethod } from "@/features/payment-methods/domain/payment-method.entity";

export function PaymentMethodPicker({
  paymentMethods,
  value,
  onChange,
  disabled,
}: {
  paymentMethods: PaymentMethod[] | undefined;
  value: string;
  onChange: (paymentMethodId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {paymentMethods?.map((method) => {
        const Icon = getPaymentMethodIcon(method.name);
        const active = method.id === value;
        return (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:border-ring/50 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-center leading-tight">{method.name}</span>
          </button>
        );
      })}
    </div>
  );
}
