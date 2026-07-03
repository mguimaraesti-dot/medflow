import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/auth/supabase-server.client";
import { handleApiError } from "@/core/errors/error-handler";
import { generateRequestId } from "@/core/utils/request-id";
import { loginSchema } from "@/features/auth/application/dtos/login.dto";
import { loginUseCase } from "@/features/auth/application/login.use-case";
import { PrismaUserRepository } from "@/features/auth/infrastructure/prisma-user.repository";

const userRepository = new PrismaUserRepository();

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const input = loginSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    const result = await loginUseCase(
      input,
      { supabase, userRepository },
      {
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, {
      requestId,
      route: "/api/auth/login",
      useCase: "loginUseCase",
    });
  }
}
