import { getSessionUser } from "@/core/auth/session";
import { TreasuryScreen } from "@/features/treasury/presentation/treasury-screen";

export default async function TreasuryPage() {
  const user = await getSessionUser();

  return <TreasuryScreen permissions={user?.permissions ?? []} />;
}
