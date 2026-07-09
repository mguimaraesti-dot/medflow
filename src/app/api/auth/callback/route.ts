import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/auth/supabase-server.client";
import { prisma } from "@/core/database/prisma.client";

/**
 * Destino do redirect do Google OAuth (`signInWithOAuth` em
 * login-form.tsx). Troca o `code` pela sessão e decide para onde
 * mandar o usuário conforme o status local: PENDING (criado agora pelo
 * trigger `handle_new_auth_user`) vai para a tela de espera, INACTIVE é
 * barrado, ACTIVE segue pro dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: data.user.id },
  });

  if (!user || user.status === "INACTIVE") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login`);
  }

  if (user.status === "PENDING") {
    return NextResponse.redirect(`${origin}/pending-approval`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.redirect(`${origin}/dashboard`);
}
