-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- AlterTable: adiciona as colunas novas primeiro (status nasce ACTIVE
-- por padrão, então a coluna NOT NULL é segura mesmo com linhas
-- existentes) para poder migrar o valor de `active` antes de dropá-la.
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Backfill: preserva o valor booleano existente antes de descartá-lo.
UPDATE "users"
SET "status" = CASE WHEN "active" THEN 'ACTIVE'::"UserStatus" ELSE 'INACTIVE'::"UserStatus" END;

-- AlterTable: remove a coluna antiga só depois do backfill acima.
ALTER TABLE "users" DROP COLUMN "active";

-- AlterTable: roleId agora é opcional (usuário PENDING ainda não tem perfil).
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";
ALTER TABLE "users" ALTER COLUMN "roleId" DROP NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
