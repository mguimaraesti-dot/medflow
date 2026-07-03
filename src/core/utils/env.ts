import { z } from "zod";

/**
 * Fonte única de verdade para variáveis de ambiente do MedFlow.
 * Se alguma variável obrigatória faltar, a aplicação falha na inicialização
 * com uma mensagem clara — em vez de um erro genérico em runtime, mais tarde,
 * em algum ponto aleatório do código.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${issues}\n\nConfira o arquivo .env com base em .env.example.`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
