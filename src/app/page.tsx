import { redirect } from "next/navigation";
import { getSessionUser } from "@/core/auth/session";

export default async function RootPage() {
  const user = await getSessionUser();
  redirect(user ? "/dashboard" : "/login");
}
