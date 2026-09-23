-- Novo valor no enum AuditAction: registra o cancelamento de uma
-- SafeMovement já CONFIRMED (SANGRIA/MANUAL_ADJUSTMENT) — corrige um
-- lançamento errado sem excluir a linha original (ver
-- cancel-confirmed-safe-movement.use-case.ts). ADD VALUE em enum
-- Postgres é puramente aditivo — não afeta linhas existentes.
ALTER TYPE "AuditAction" ADD VALUE 'SAFE_MOVEMENT_CANCELLED';
