import { Readable } from "stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

/**
 * OAuth2 com refresh token — Service Account foi descartada porque
 * contas de serviço não têm cota de armazenamento própria no Google
 * Drive ("Service Accounts do not have storage quota"), então todo
 * upload falhava mesmo com a pasta compartilhada como Editor. O refresh
 * token foi gerado uma vez (fora deste código, via consentimento OAuth
 * do usuário dono do Drive) já com o escopo `drive.file` — não é
 * passado de novo aqui, só reaproveitado a cada requisição via
 * `setCredentials`; a biblioteca troca por um access token novo
 * automaticamente quando necessário.
 *
 * Nunca importar este módulo em código "use client": lê variáveis sem
 * prefixo NEXT_PUBLIC_, só existe no servidor de qualquer forma (mesmo
 * cuidado de `core/auth/supabase-admin.client.ts`).
 */
interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId: string;
}

/** Nunca loga client_secret nem refresh_token — só a mensagem de "faltando configurar" quando aplicável. */
function loadConfig(): GoogleDriveConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !refreshToken || !folderId) {
    throw new Error(
      "Google Drive não configurado: defina GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN e GOOGLE_DRIVE_FOLDER_ID.",
    );
  }

  return { clientId, clientSecret, refreshToken, folderId };
}

let cachedDrive: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive;

  const { clientId, clientSecret, refreshToken } = loadConfig();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  cachedDrive = google.drive({ version: "v3", auth: oauth2Client });
  return cachedDrive;
}

export function getGoogleDriveFolderId(): string {
  return loadConfig().folderId;
}

function isInvalidGrantError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as {
    message?: unknown;
    response?: { data?: { error?: unknown } };
  };
  if (err.response?.data?.error === "invalid_grant") return true;
  return (
    typeof err.message === "string" && err.message.includes("invalid_grant")
  );
}

/**
 * Traduz uma falha de "invalid_grant" (refresh token revogado, expirado
 * ou nunca autorizado com o escopo certo) numa mensagem que explica o
 * que fazer — o restante das falhas do Drive (timeout, cota, 5xx)
 * passa direto, sem embrulhar duas vezes (quem chama já vira
 * `AttachmentStorageError` com log próprio).
 */
function toDriveError(error: unknown): Error {
  if (isInvalidGrantError(error)) {
    return new Error(
      "Refresh token inválido ou expirado — gere um novo refresh token OAuth2 (consentimento do dono do Drive) e atualize GOOGLE_OAUTH_REFRESH_TOKEN.",
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}

export interface UploadToDriveInput {
  name: string;
  mimeType: string;
  buffer: Buffer;
  parentFolderId: string;
}

export interface DriveUploadResult {
  fileId: string;
  sizeBytes: number;
}

export async function uploadFileToDrive(
  input: UploadToDriveInput,
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  try {
    const response = await drive.files.create({
      requestBody: { name: input.name, parents: [input.parentFolderId] },
      media: { mimeType: input.mimeType, body: Readable.from(input.buffer) },
      fields: "id, size",
    });

    const fileId = response.data.id;
    if (!fileId) {
      throw new Error("Google Drive não retornou o id do arquivo enviado.");
    }

    return {
      fileId,
      sizeBytes: response.data.size
        ? Number(response.data.size)
        : input.buffer.length,
    };
  } catch (error) {
    throw toDriveError(error);
  }
}

function extractHttpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const err = error as { code?: unknown; response?: { status?: unknown } };
  if (typeof err.code === "number") return err.code;
  if (typeof err.response?.status === "number") return err.response.status;
  return undefined;
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    // Arquivo já removido manualmente no Drive (fora do fluxo do app) —
    // não deve travar a exclusão do registro no banco.
    if (extractHttpStatus(error) === 404) return;
    throw toDriveError(error);
  }
}

export interface DriveDownload {
  stream: Readable;
  mimeType: string;
}

export async function downloadFileFromDrive(
  fileId: string,
): Promise<DriveDownload> {
  const drive = getDriveClient();
  try {
    const metadata = await drive.files.get({ fileId, fields: "mimeType" });
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" },
    );

    return {
      stream: response.data as unknown as Readable,
      mimeType: metadata.data.mimeType ?? "application/octet-stream",
    };
  } catch (error) {
    throw toDriveError(error);
  }
}
