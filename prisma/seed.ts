import "dotenv/config";
import { PrismaClient, RoleName } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { ROLE_PERMISSIONS } from "../src/core/permissions/roles-permissions";
import {
  WHATSAPP_SYSTEM_USER_EMAIL,
  WHATSAPP_SYSTEM_USER_NAME,
} from "../src/features/accounts-payable/domain/whatsapp-system-user";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "./seed-data";

const prisma = new PrismaClient();

/**
 * Variáveis exclusivas do seed — não fazem parte do core/utils/env.ts
 * porque só são necessárias neste script, nunca no runtime da aplicação.
 */
const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const ADMIN_EMAIL = requireEnv("SEED_ADMIN_EMAIL");
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD");
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Administrador MedFlow";
const ORG_NAME = process.env.SEED_ORGANIZATION_NAME ?? "Clínica MAE";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória para o seed ausente: ${key}. Confira o .env.`,
    );
  }
  return value;
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function upsertPermissions(): Promise<void> {
  const allKeys = Array.from(new Set(Object.values(ROLE_PERMISSIONS).flat()));

  for (const key of allKeys) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  console.log(`✔ ${allKeys.length} permissões garantidas`);
}

async function upsertRoles(): Promise<void> {
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const permissionKeys = ROLE_PERMISSIONS[roleName];
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        permissions: { set: permissions.map((p) => ({ id: p.id })) },
      },
      create: {
        name: roleName,
        permissions: { connect: permissions.map((p) => ({ id: p.id })) },
      },
    });
  }

  console.log(`✔ ${Object.keys(ROLE_PERMISSIONS).length} roles garantidas`);
}

async function upsertOrganization() {
  // Estrutura pronta para multiempresa, mas o MVP opera com uma única
  // organização — buscamos por nome em vez de um id fixo.
  const existing = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
  });

  const organization =
    existing ??
    (await prisma.organization.create({
      data: { name: ORG_NAME },
    }));

  await prisma.organizationSettings.upsert({
    where: { organizationId: organization.id },
    update: {},
    create: {
      organizationId: organization.id,
      tradeName: ORG_NAME,
    },
  });

  console.log(
    `✔ Organização "${organization.name}" garantida (${organization.id})`,
  );
  return organization;
}

async function upsertAdminAuthUser(): Promise<string> {
  // A API Admin do Supabase não tem "upsert" — tentamos criar e, se já
  // existir, buscamos o usuário existente pelo e-mail.
  const { data: created, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

  if (!createError && created.user) {
    console.log(`✔ Usuário Supabase Auth criado (${ADMIN_EMAIL})`);
    return created.user.id;
  }

  // Já existe — busca paginada até encontrar o e-mail (API não tem
  // "getUserByEmail" direto na versão usada por este projeto).
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
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    );
    if (found) {
      console.log(`✔ Usuário Supabase Auth já existia (${ADMIN_EMAIL})`);
      return found.id;
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  throw new Error(
    `Não foi possível criar nem encontrar o usuário admin (${ADMIN_EMAIL}) no Supabase Auth. ` +
      `Erro original ao criar: ${createError?.message}`,
  );
}

async function upsertAdminUser(organizationId: string, supabaseAuthId: string) {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "ADMIN" },
  });

  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { supabaseAuthId, roleId: adminRole.id, organizationId },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      supabaseAuthId,
      roleId: adminRole.id,
      organizationId,
    },
  });

  console.log(`✔ Usuário admin garantido no banco (${user.email})`);
  return user;
}

/**
 * Usuário de sistema sem organização e sem conta real no Supabase Auth
 * (nunca faz login) — só existe pra manter `paidByUserId`/
 * `performedByUserId` apontando pra um usuário de verdade quando o
 * pagamento é confirmado pelo webhook da Z-API (sem ninguém logado).
 * `organizationId: null` o mantém fora da listagem de Gestão de Acessos
 * (que sempre filtra por organização). O `supabaseAuthId` é um valor
 * sentinela fixo — nunca corresponde a uma conta real.
 */
async function upsertWhatsAppSystemUser(): Promise<void> {
  await prisma.user.upsert({
    where: { email: WHATSAPP_SYSTEM_USER_EMAIL },
    update: { name: WHATSAPP_SYSTEM_USER_NAME },
    create: {
      email: WHATSAPP_SYSTEM_USER_EMAIL,
      name: WHATSAPP_SYSTEM_USER_NAME,
      supabaseAuthId: "00000000-0000-0000-0000-000000000000",
      status: "INACTIVE",
    },
  });

  console.log(`✔ Usuário de sistema garantido (${WHATSAPP_SYSTEM_USER_EMAIL})`);
}

async function upsertCategories(organizationId: string) {
  const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  for (const category of all) {
    await prisma.category.upsert({
      where: {
        organizationId_name_type: {
          organizationId,
          name: category.name,
          type: category.type,
        },
      },
      update: {
        color: category.color,
        icon: category.icon,
        displayOrder: category.displayOrder,
      },
      create: {
        organizationId,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        displayOrder: category.displayOrder,
      },
    });
  }

  console.log(`✔ ${all.length} categorias garantidas`);
}

async function upsertPaymentMethods(organizationId: string) {
  for (const method of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: {
        organizationId_name: { organizationId, name: method.name },
      },
      update: {
        displayOrder: method.displayOrder,
        isCash: method.isCash ?? false,
      },
      create: {
        organizationId,
        name: method.name,
        displayOrder: method.displayOrder,
        isCash: method.isCash ?? false,
      },
    });
  }

  console.log(`✔ ${PAYMENT_METHODS.length} formas de pagamento garantidas`);
}

/**
 * Motor de Tesouraria (docs/decisions/adr-tesouraria.md): garante o
 * Cofre da organização e, se ele ainda não tiver nenhuma movimentação,
 * credita um saldo inicial de bootstrap — sem isso o ambiente de dev
 * fica travado (não dá pra abrir o primeiro caixa sem saldo no Cofre).
 */
async function upsertSafe(organizationId: string, adminUserId: string) {
  const safe = await prisma.safe.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId },
  });

  const movementCount = await prisma.safeMovement.count({
    where: { safeId: safe.id },
  });

  if (movementCount === 0) {
    await prisma.safeMovement.create({
      data: {
        organizationId,
        safeId: safe.id,
        type: "MANUAL_ADJUSTMENT",
        amount: "2000.00",
        performedByUserId: adminUserId,
        reason: "Saldo inicial de bootstrap (seed)",
      },
    });
    console.log(
      "✔ Cofre garantido, com saldo inicial de bootstrap (R$ 2000,00)",
    );
  } else {
    console.log("✔ Cofre garantido (já tinha movimentações)");
  }
}

async function main() {
  console.log("🌱 Iniciando seed do MedFlow...\n");

  await upsertPermissions();
  await upsertRoles();
  const organization = await upsertOrganization();
  const supabaseAuthId = await upsertAdminAuthUser();
  const admin = await upsertAdminUser(organization.id, supabaseAuthId);
  await upsertWhatsAppSystemUser();
  await upsertCategories(organization.id);
  await upsertPaymentMethods(organization.id);
  await upsertSafe(organization.id, admin.id);

  console.log("\n✅ Seed concluído. Login inicial:");
  console.log(`   e-mail: ${ADMIN_EMAIL}`);
  console.log(`   senha:  a que foi definida em SEED_ADMIN_PASSWORD no .env`);
}

main()
  .catch((error) => {
    console.error("\n❌ Seed falhou:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
