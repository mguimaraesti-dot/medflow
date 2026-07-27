-- Novo valor no enum RoleName: perfil Diretor (leitura em todos os
-- módulos + geração/exportação de relatórios, nenhuma escrita de
-- negócio, sem acesso a Configurações/Usuários). ADD VALUE em enum
-- Postgres é puramente aditivo — não afeta linhas existentes.
ALTER TYPE "RoleName" ADD VALUE 'DIRECTOR';
