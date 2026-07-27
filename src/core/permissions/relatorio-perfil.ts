import { PERMISSIONS } from "./roles-permissions";

export type RelatorioPerfil = "leitor" | "gestor" | null;

/**
 * Deriva o perfil de acesso ao relatorio-exames (app irmão, mesmo
 * projeto Supabase Auth) a partir das permissões do MedFlow — nunca do
 * nome do papel diretamente, para não precisar de um segundo mapa toda
 * vez que um papel novo (ex.: Diretor) entra no RBAC.
 *
 * Regra: sem `DASHBOARD_READ` não há acesso nenhum — `null`, nunca
 * "leitor" por padrão (a Secretária, que só tem o módulo de Caixa
 * Recepção, tem que sair daqui como `null`; um `else` cai fácil nisso
 * por engano). Entre quem tem `DASHBOARD_READ`, só quem administra
 * usuários no MedFlow (`USERS_MANAGE`) importa CSV lá — os dois únicos
 * perfis do relatório que importam são "gestor" e "admin", e o
 * mapeamento automático nunca atribui "admin" (ver CLAUDE.md, "Acesso
 * ao relatorio-exames" — hoje "admin" não faz nada que "gestor" não
 * faça, fica reservado pra atribuição manual).
 */
export function mapRoleToRelatorioPerfil(
  permissions: string[],
): RelatorioPerfil {
  if (!permissions.includes(PERMISSIONS.DASHBOARD_READ)) return null;
  if (permissions.includes(PERMISSIONS.USERS_MANAGE)) return "gestor";
  return "leitor";
}
