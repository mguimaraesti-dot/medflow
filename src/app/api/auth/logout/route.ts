import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/auth/supabase-server.client";
import { handleApiError } from "@/core/errors/error-handler";
import { generateRequestId } from "@/core/utils/request-id";
import { logoutUseCase } from "@/features/auth/application/logout.use-case";

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const supabase = await createSupabaseServerClient();

    await logoutUseCase(
      { supabase },
      {
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    );

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/auth/logout",
      useCase: "logoutUseCase",
    });
  }
}
