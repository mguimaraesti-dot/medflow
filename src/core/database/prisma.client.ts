import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma Client.
 * Em desenvolvimento, o Next.js recarrega módulos a cada mudança de arquivo,
 * o que recriaria o client (e a conexão) a cada hot reload sem esse padrão.
 * Guardamos a instância no objeto global para reaproveitá-la entre reloads.
 *
 * Regra de arquitetura (Coding Standards 13.5): este é o ÚNICO ponto do
 * projeto autorizado a importar "@prisma/client". Repositórios em
 * features/*\/infrastructure importam o client a partir daqui, nunca
 * diretamente de "@prisma/client".
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
