import { google } from "googleapis";

export interface DriveDoc {
  id: string;
  title: string;
  content: string;
  modifiedTime: string;
  webViewLink: string | null;
}

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const PLAIN_TEXT_MIME = "text/plain";
const MARKDOWN_MIME = "text/markdown";
const SHORTCUT_MIME = "application/vnd.google-apps.shortcut";

const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_TOTAL_CHARS = 200_000;

let cache: { docs: DriveDoc[]; fetchedAt: number } | null = null;

function getAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive isn't configured yet — GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REFRESH_TOKEN must be set."
    );
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function fetchFolderContents(): Promise<DriveDoc[]> {
  const folderId = process.env.ASK_BROCK_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("ASK_BROCK_DRIVE_FOLDER_ID is not configured.");
  }

  const drive = google.drive({ version: "v3", auth: getAuth() });

  const listRes = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, modifiedTime, webViewLink, shortcutDetails(targetId, targetMimeType))",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives",
    pageSize: 200,
  });

  const files = listRes.data.files ?? [];
  const docs: DriveDoc[] = [];

  for (const file of files) {
    if (!file.id || !file.name || !file.mimeType) continue;

    // Shortcuts (the normal way to "add" an existing Drive file into this folder without
    // duplicating it) point at a real file elsewhere — resolve to the target for reading.
    const targetId = file.mimeType === SHORTCUT_MIME ? file.shortcutDetails?.targetId : file.id;
    const targetMimeType = file.mimeType === SHORTCUT_MIME ? file.shortcutDetails?.targetMimeType : file.mimeType;
    if (!targetId || !targetMimeType) continue;

    try {
      let content: string | null = null;

      if (targetMimeType === GOOGLE_DOC_MIME) {
        const exportRes = await drive.files.export(
          { fileId: targetId, mimeType: PLAIN_TEXT_MIME },
          { responseType: "text" }
        );
        content = String(exportRes.data);
      } else if (targetMimeType === PLAIN_TEXT_MIME || targetMimeType === MARKDOWN_MIME) {
        const getRes = await drive.files.get(
          { fileId: targetId, alt: "media", supportsAllDrives: true },
          { responseType: "text" }
        );
        content = String(getRes.data);
      } else {
        // Slides, Sheets, PDFs, .docx, images, video, etc. — not supported for text extraction yet.
        continue;
      }

      if (content && content.trim()) {
        docs.push({
          id: file.id,
          title: file.name,
          content: content.trim(),
          modifiedTime: file.modifiedTime ?? new Date(0).toISOString(),
          webViewLink: file.webViewLink ?? null,
        });
      }
    } catch (err) {
      console.error(`[ask-brock] Failed to read Drive file "${file.name}" (${file.id}):`, err);
    }
  }

  docs.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

  let totalChars = 0;
  const capped: DriveDoc[] = [];
  for (const doc of docs) {
    if (totalChars + doc.content.length > MAX_TOTAL_CHARS) break;
    capped.push(doc);
    totalChars += doc.content.length;
  }

  return capped;
}

export async function getAskBrockContent(): Promise<DriveDoc[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.docs;
  }
  const docs = await fetchFolderContents();
  cache = { docs, fetchedAt: Date.now() };
  return docs;
}
