import { getSessionUser } from "@/core/auth/session";
import { DashboardScreen } from "@/features/dashboard/presentation/dashboard-screen";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardScreen permissions={user?.permissions ?? []} />
    </div>
  );
}
