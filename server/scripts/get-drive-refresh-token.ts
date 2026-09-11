import http from "http";
import { URL } from "url";
import { google } from "googleapis";

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const PORT = process.argv[4] ? Number(process.argv[4]) : 45781;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Usage: tsx scripts/get-drive-refresh-token.ts <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
});

console.log("\nOpen this URL in your browser and sign in as the account with access to the Knowledge Base folder:\n");
console.log(authUrl);
console.log(`\nWaiting for you to approve access (listening on http://localhost:${PORT})...\n`);

const server = http.createServer(async (req, res) => {
  if (!req.url) return;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" }).end(`<h1>Authorization failed</h1><p>${error}</p>`);
    console.error("Authorization failed:", error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400).end("Missing code");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" }).end(
      "<h1>Success</h1><p>You can close this tab and return to the terminal.</p>"
    );

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh token was returned. This usually means you've authorized this app before without revoking it.\n" +
          "Go to https://myaccount.google.com/permissions, remove access for this app, and run this script again.\n"
      );
      process.exit(1);
    }

    console.log("\nSuccess! Here's the refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\n");
  } catch (err) {
    console.error("Failed to exchange code for tokens:", err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(PORT, "127.0.0.1");
