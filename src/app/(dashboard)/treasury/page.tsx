import { getSessionUser } from "@/core/auth/session";
import { TreasuryScreen } from "@/features/treasury/presentation/treasury-screen";

export default async function TreasuryPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tesouraria</h1>
      <TreasuryScreen permissions={user?.permissions ?? []} />
    </div>
  );
}
