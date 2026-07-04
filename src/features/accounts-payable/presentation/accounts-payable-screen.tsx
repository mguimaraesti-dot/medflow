"use client";

import { PERMISSIONS } from "@/core/permissions/roles-permissions";
import { AccountsPayableForm } from "./accounts-payable-form";
import { AccountsPayableTable } from "./accounts-payable-table";
import { RecurringBillsPanel } from "@/features/recurring-bills/presentation/recurring-bills-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function AccountsPayableScreen({
  permissions,
}: {
  permissions: string[];
}) {
  const can = (permission: string) => permissions.includes(permission);

  return (
    <Tabs defaultValue="payable">
      <TabsList>
        <TabsTrigger value="payable">Contas a Pagar</TabsTrigger>
        <TabsTrigger value="recurring">Recorrências</TabsTrigger>
      </TabsList>

      <TabsContent value="payable" className="space-y-6">
        {can(PERMISSIONS.PAYABLE_CREATE) && <AccountsPayableForm />}
        <AccountsPayableTable canPay={can(PERMISSIONS.PAYABLE_PAY)} />
      </TabsContent>

      <TabsContent value="recurring">
        <RecurringBillsPanel />
      </TabsContent>
    </Tabs>
  );
}
