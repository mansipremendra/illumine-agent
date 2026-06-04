/**
 * VERCEL SERVERLESS FUNCTION - ILLUMINE AGENT
 * Endpoint: /api/agent
 * Triggered by cron job daily at 08:00 UTC
 *
 * Flow:
 * 1. Auto-creates CONTENT_LOG and ACTIVITY_LOG tabs in Google Sheet
 * 2. Generates diverse D2C content using Claude
 * 3. Logs content to Google Sheet (ALWAYS - independent of Buffer)
 * 4. Attempts to post to Buffer (failure here does NOT stop sheet logging)
 *
 * KEY FIXES vs previous version:
 *  - Handler now accepts GET (Vercel cron sends GET, not POST)
 *  - Uses a valid Claude model string
 *  - Buffer posting is isolated in try/catch so it can never wipe the run
 *  - googleapis dependency corrected in package.json
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheetsClient = google.sheets({ version: "v4", auth });

// Optional Buffer posting - loaded lazily so a broken/missing Buffer
// integration can never crash the whole agent at import time.
async function tryPostToBuffer(linkedinContent, instagramContent) {
  try {
    const { default: BufferPostingService } = await import("./buffer-service.js");
    const bufferService = new BufferPostingService(process.env.BUFFER_ACCESS_TOKEN);

    const linkedinResult = await bufferService.postToLinkedIn(
      linkedinContent,
      bufferService.getScheduledTime("17:00")
    );
    const instagramResult = await bufferService.postToInstagram(
      instagramContent,
      bufferService.getScheduledTime("19:00")
    );
    return { ok: true, linkedinResult, instagramResult };
  } catch (err) {
    console.error("[BUFFER] Posting failed (sheet logging continues):", err.message);
    return { ok: false, error: err.message, linkedinResult: null, instagramResult: null };
  }
}

/**
 * Auto-create Google Sheet tabs if they don't exist
 */
async function ensureSheetTabs() {
  console.log("[SHEETS] Checking for required tabs...");

  const spreadsheet = await sheetsClient.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });

  const existingTabs = spreadsheet.data.sheets.map((s) => s.properties.title);
  console.log("[SHEETS] Existing tabs:", existingTabs);

  const requiredTabs = ["CONTENT_LOG", "ACTIVITY_LOG"];

  for (const tabName of requiredTabs) {
    if (!existingTabs.includes(tabName)) {
      console.log(`[SHEETS] Creating tab: ${tabName}`);

      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabName,
                  gridProperties: { rowCount: 1000, columnCount: 15 },
                },
              },
            },
          ],
        },
      });

      const headers =
        tabName === "CONTENT_LOG"
          ? ["Date", "Time", "Platform", "Content_Theme", "Text", "Buffer_ID",
             "Scheduled_At", "Status", "LinkedIn_UTM_URL", "Instagram_Bio_Link", "Notes"]
          : ["Timestamp", "Event", "Content_Theme", "Platform", "Details",
             "UTM_Campaign", "Buffer_ID", "Status"];

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${tabName}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });

      console.log(`[SHEETS] Tab created with headers: ${tabName}`);
    }
  }
}

/**
 * Main agent logic
 */
async function runAgent() {
  console.log("[AGENT] Starting Illumine social media agent...");

  await ensureSheetTabs();

  const contentThemes = [
    { name: "Psychology", campaign: "consumer-psychology",
      description: "Consumer psychology, behavioral economics, neuromarketing insights for D2C paid ads" },
    { name: "Paid Ads Strategy", campaign: "meta-google-ads",
      description: "Meta Ads, Google Ads, LinkedIn Ads optimization tips, attribution, bidding strategies" },
    { name: "D2C Scaling", campaign: "d2c-scaling",
      description: "D2C growth frameworks, unit economics, customer retention, scaling strategies" },
    { name: "Creative Strategy", campaign: "creative-strategy",
      description: "Ad creative best practices, copywriting for conversion, creative testing frameworks" },
    { name: "Case Study", campaign: "case-study",
      description: "Anonymized D2C brand case studies - what worked, results, lessons learned" },
    { name: "Performance Marketing", campaign: "performance-marketing",
      description: "Latest performance marketing developments, platform algorithm changes, measurement" },
  ];

  const todayTheme = contentThemes[Math.floor(Math.random() * contentThemes.length)];
  console.log("[AGENT] Today's content theme:", todayTheme.name);

  // Generate content
  const contentPrompt = `Generate 2 distinct social media posts for D2C founders about: ${todayTheme.description}

Post 1 (LinkedIn - professional, ~280 chars):
- Deep insight or framework related to ${todayTheme.name}
- Include a research reference or real example
- Professional tone, actionable for D2C founders

Post 2 (Instagram - engaging, ~150 chars):
- Same core insight but more conversational
- Include 2-3 relevant hashtags
- Punchy tone with a call-to-action

Respond ONLY with raw JSON, no markdown fences, with keys: linkedin_text, instagram_text`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: contentPrompt }],
  });

  const generatedText = response.content[0].type === "text" ? response.content[0].text : "";

  let content = { linkedin_text: "", instagram_text: "" };
  try {
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.log("[AGENT] JSON parse failed, using raw text");
    content = {
      linkedin_text: generatedText.substring(0, 280),
      instagram_text: generatedText.substring(0, 150),
    };
  }

  console.log("[AGENT] LinkedIn:", content.linkedin_text);
  console.log("[AGENT] Instagram:", content.instagram_text);

  // Attempt Buffer posting - isolated, never fatal
  const buffer = await tryPostToBuffer(
    { text: content.linkedin_text, utmOptions: { destination: "vault", campaign: todayTheme.campaign, contentType: "text" } },
    { text: content.instagram_text, utmOptions: { destination: "vault", campaign: todayTheme.campaign, contentType: "text" } }
  );

  const now = new Date();
  const timestamp = now.toISOString();
  const dateStr = timestamp.split("T")[0];
  const timeStr = timestamp.split("T")[1].substring(0, 5);
  const postStatus = buffer.ok ? "POSTED" : "GENERATED_NOT_POSTED";

  // ALWAYS log content (this is the part that was never reaching the sheet)
  console.log("[AGENT] Logging content to CONTENT_LOG...");
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:K",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [dateStr, timeStr, "LinkedIn", todayTheme.name, content.linkedin_text,
         buffer.linkedinResult?.id || "N/A", buffer.linkedinResult?.scheduledAt || "N/A",
         postStatus, buffer.linkedinResult?.taggedURL || "N/A", "N/A",
         `Campaign: ${todayTheme.campaign}${buffer.ok ? "" : " | Buffer error: " + buffer.error}`],
        [dateStr, timeStr, "Instagram", todayTheme.name, content.instagram_text,
         buffer.instagramResult?.id || "N/A", buffer.instagramResult?.scheduledAt || "N/A",
         postStatus, "N/A", buffer.instagramResult?.bioLink || "N/A",
         `Campaign: ${todayTheme.campaign}`],
      ],
    },
  });

  console.log("[AGENT] Logging activity...");
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "ACTIVITY_LOG!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        timestamp,
        buffer.ok ? "CONTENT_GENERATED_AND_POSTED" : "CONTENT_GENERATED_ONLY",
        todayTheme.name, "LinkedIn + Instagram",
        buffer.ok ? "Posts scheduled with UTM tracking" : "Content generated; Buffer posting failed",
        todayTheme.campaign,
        `LI: ${buffer.linkedinResult?.id || "-"} | IG: ${buffer.instagramResult?.id || "-"}`,
        buffer.ok ? "SUCCESS" : "PARTIAL",
      ]],
    },
  });

  console.log("[AGENT] Execution completed. Buffer ok:", buffer.ok);

  return {
    status: 200,
    message: buffer.ok ? "Content generated and posted" : "Content generated and logged (Buffer not posted)",
    theme: todayTheme.name,
    content,
    bufferOk: buffer.ok,
  };
}

/**
 * Vercel serverless function handler
 * Accepts GET (Vercel cron) and POST (manual trigger).
 */
export default async function handler(req, res) {
  console.log(`[${new Date().toISOString()}] API Request: ${req.method}`);

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await runAgent();
    return res.status(result.status).json(result);
  } catch (error) {
    console.error("[AGENT ERROR]", error);
    // Best-effort error logging to the sheet
    try {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "ACTIVITY_LOG!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[new Date().toISOString(), "ERROR", "UNKNOWN", "N/A",
                    error.message, "N/A", "N/A", "FAILED"]],
        },
      });
    } catch (logError) {
      console.error("[AGENT] Could not log error to sheet:", logError.message);
    }
    return res.status(500).json({ status: 500, message: "Agent failed", error: error.message });
  }
}
