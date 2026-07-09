import { Readable } from "stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

/**
 * Escopo `drive.file` — a service account só enxerga/gerencia arquivos
 * que ela mesma criou (nunca o Drive inteiro), mesmo com a pasta
 * compartilhada como Editor. Nunca importar este módulo em código
 * "use client": lê variáveis sem prefixo NEXT_PUBLIC_, só existe no
 * servidor de qualquer forma (mesmo cuidado de
 * `core/auth/supabase-admin.client.ts`).
 */
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.file"];

interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  folderId: string;
}

/**
 * Nunca loga a private_key nem qualquer credencial — só a mensagem de
 * "faltando configurar" quando aplicável. A causa completa de falhas de
 * chamada à API do Drive é responsabilidade de quem chama (a
 * infraestrutura de anexos loga com `logger`, sem o objeto de erro cru).
 */
function loadConfig(): GoogleDriveConfig {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientEmail || !rawPrivateKey || !folderId) {
    throw new Error(
      "Google Drive não configurado: defina GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY e GOOGLE_DRIVE_FOLDER_ID.",
    );
  }

  // Na Vercel a env var normalmente chega com "\n" literal (2
  // caracteres) em vez de quebra de linha real — sem isso a chave PEM
  // não parseia. Se já vier com quebra real (ex: .env local), não mexe.
  const privateKey = rawPrivateKey.includes("\\n")
    ? rawPrivateKey.replace(/\\n/g, "\n")
    : rawPrivateKey;

  return { clientEmail, privateKey, folderId };
}

let cachedDrive: drive_v3.Drive | null = null;

function getDriveClient(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive;

  const { clientEmail, privateKey } = loadConfig();
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: DRIVE_SCOPES,
  });

  cachedDrive = google.drive({ version: "v3", auth });
  return cachedDrive;
}

export function getGoogleDriveFolderId(): string {
  return loadConfig().folderId;
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
    throw error;
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
  const metadata = await drive.files.get({ fileId, fields: "mimeType" });
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" },
  );

  return {
    stream: response.data as unknown as Readable,
    mimeType: metadata.data.mimeType ?? "application/octet-stream",
  };
}
