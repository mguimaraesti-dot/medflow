import "dotenv/config";
import { PrismaClient, RoleName } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

/**
 * Script de apoio para criar usuários de teste com uma role específica
 * (SECRETARY, FINANCE, OWNER, ACCOUNTANT, ADMIN) na mesma organização
 * já criada pelo `prisma/seed.ts` — útil enquanto não existe tela de
 * cadastro de usuários (Sprint 2). Segue o mesmo padrão do seed
 * (Supabase Auth + linha `User` no Postgres).
 *
 * Uso:
 *   npx tsx prisma/create-test-user.ts <ROLE> <email> <senha> "<nome>"
 *
 * Exemplo:
 *   npx tsx prisma/create-test-user.ts SECRETARY secretaria@teste.medflow.local "Teste@1234" "Secretária Teste"
 */

const prisma = new PrismaClient();

const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ORG_NAME = process.env.SEED_ORGANIZATION_NAME ?? "Clínica MAE";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${key}. Confira o .env.`,
    );
  }
  return value;
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertAuthUser(
  email: string,
  password: string,
): Promise<string> {
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (!createError && created.user) {
    console.log(`✔ Usuário Supabase Auth criado (${email})`);
    return created.user.id;
  }

  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error(
        `Falha ao listar usuários do Supabase Auth: ${error.message}`,
      );
    }

    const found = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) {
      console.log(`✔ Usuário Supabase Auth já existia (${email})`);
      return found.id;
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  throw new Error(
    `Não foi possível criar nem encontrar o usuário (${email}) no Supabase Auth. ` +
      `Erro original ao criar: ${createError?.message}`,
  );
}

async function main() {
  const [roleArg, email, password, name] = process.argv.slice(2);

  if (!roleArg || !email || !password || !name) {
    console.error(
      'Uso: npx tsx prisma/create-test-user.ts <ROLE> <email> <senha> "<nome>"',
    );
    console.error(`Roles válidas: ${Object.values(RoleName).join(", ")}`);
    process.exit(1);
  }

  if (!Object.values(RoleName).includes(roleArg as RoleName)) {
    throw new Error(
      `Role inválida: "${roleArg}". Use uma de: ${Object.values(RoleName).join(", ")}`,
    );
  }
  const roleName = roleArg as RoleName;

  const organization = await prisma.organization.findFirstOrThrow({
    where: { name: ORG_NAME },
  });

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: roleName },
  });

  const supabaseAuthId = await upsertAuthUser(email, password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      supabaseAuthId,
      roleId: role.id,
      organizationId: organization.id,
    },
    create: {
      email,
      name,
      supabaseAuthId,
      roleId: role.id,
      organizationId: organization.id,
    },
  });

  console.log(`\n✅ Usuário de teste garantido:`);
  console.log(`   nome:  ${user.name}`);
  console.log(`   email: ${user.email}`);
  console.log(`   role:  ${roleName}`);
  console.log(`   senha: a informada no comando`);
}

main()
  .catch((error) => {
    console.error("\n❌ Falha ao criar usuário de teste:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
