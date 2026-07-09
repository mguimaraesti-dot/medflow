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
    <div className="flex flex-wrap gap-2">
      {paymentMethods?.map((method) => {
        const Icon = getPaymentMethodIcon(method.name);
        const active = method.id === value;
        return (
          <button
            key={method.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(method.id)}
            aria-pressed={active}
            className={cn(
              "focus-visible:ring-ring focus-visible:ring-offset-background flex h-12 flex-1 basis-24 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-input-background text-muted-foreground hover:border-ring/50 hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{method.name}</span>
          </button>
        );
      })}
    </div>
  );
}
