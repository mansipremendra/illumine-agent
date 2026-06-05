/**
 * ILLUMINE ADS SOCIAL MEDIA AGENT - FINAL VERSION
 * 
 * Daily pipeline:
 * 1. Determines content theme based on day of week
 * 2. Searches for real news (Mon/Thu) or uses evergreen topics (other days)
 * 3. Generates expert post content using Claude
 * 4. Renders 1080x1350 portrait image using Puppeteer
 * 5. Uploads image to Google Drive (public URL)
 * 6. Logs caption + image URL to CONTENT_LOG sheet
 * 7. Make.com picks up new row → posts to Buffer → LinkedIn + Instagram
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { chromium } from "playwright-core";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── AUTH ────────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").split(String.fromCharCode(92,110)).join(String.fromCharCode(10)),
  },
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
  ],
});

const sheetsClient = google.sheets({ version: "v4", auth });
const driveClient = google.drive({ version: "v3", auth });

// ─── CONTENT CALENDAR ────────────────────────────────────────────────────────

const CALENDAR = {
  0: { // Monday
    theme: "Platform News",
    prompt: `Find a real, specific Meta Ads or Google Ads development from the past 7 days.
Write a post that:
- Opens with the exact change and its date
- Explains the mechanical impact on a D2C brand's ad account
- Gives one concrete action for this week
- Ends with a line showing deeper understanding than most coverage
Topic area: Meta algorithm updates, new ad formats, attribution changes, policy updates, or Google Ads features.`
  },
  1: { // Tuesday
    theme: "Neuromarketing",
    prompt: `Write a post about a specific, named neuromarketing principle or study.
Use real named concepts: Von Restorff Effect, Scarcity Heuristic, Dual Process Theory, Anchoring, Social Proof mechanisms, Loss Aversion, The Paradox of Choice, etc.
Structure:
- Open with the principle name and a surprising implication
- Explain why the brain actually behaves this way
- Show exactly how a D2C beauty/supplements/fashion brand applies this in Meta ads
- Be specific: which creative element changes and how`
  },
  2: { // Wednesday
    theme: "Consumer Psychology",
    prompt: `Write a post about a specific consumer psychology framework or buying behaviour pattern.
Use real frameworks: Jobs To Be Done, Identity-Based Purchasing, Buyer's Remorse Prevention, Price Anchoring, The Endowment Effect, etc.
Structure:
- Open with a behaviour most founders have noticed but never understood
- Explain the psychological mechanism behind it
- Show how to use it in ad creative, landing page, or offer structure
- Give one implementable change this week`
  },
  3: { // Thursday
    theme: "Platform News",
    prompt: `Find a real, specific Meta Ads or Google Ads development — different from typical Monday topics.
Focus on: creative tools, audience features, measurement updates, Advantage+ changes, or Shopping campaign updates.
Write a post that:
- Opens with the specific change and date
- Explains what mechanically changed
- Tells a D2C founder what this means for their spend
- Ends with an honest assessment including limitations most coverage ignores`
  },
  4: { // Friday
    theme: "Funnel Optimisation",
    prompt: `Write a post about a specific funnel stage, drop-off pattern, or conversion fix.
Pick one specific stage: awareness hook rate, landing page friction, checkout abandonment, post-purchase retention, or retargeting sequences.
Structure:
- Open with a specific surprising stat or pattern about where D2C brands lose money
- Explain the real reason it happens (not the surface one)
- Give a step-by-step fix implementable this week
- Be specific about the platform, tool, or setting involved`
  },
  5: { // Saturday
    theme: "AI in Marketing",
    prompt: `Write a post about a specific AI development and its real impact on paid marketing.
Use a real recent development — a tool launch, model capability, or platform integration.
Structure:
- Open with what specifically launched or changed, and when
- Explain what it actually does vs what the press release claims
- Tell a D2C founder running Meta ads what this means for their workflow
- Be honest about what it cannot do yet
- End with: worth attention now or in 6 months?`
  },
  6: { // Sunday
    theme: "Sunday Quip",
    prompt: `Write a single genuinely funny observation about marketing, consumer psychology, human behaviour, or AI.
Rules:
- Maximum 3 lines total
- Makes a marketer laugh because it's true, not because it's trying to be funny
- No hashtags
- No emojis
- The kind of thing someone screenshots and sends to their team`
  }
};

// ─── SLIDE RENDERER ──────────────────────────────────────────────────────────

function buildHTML(lines, isQuip = false) {
  const fontSize = isQuip ? "52px" : "42px";
  const paras = lines.map(l =>
    l.trim() === ""
      ? '<div class="spacer"></div>'
      : `<p>${l}</p>`
  ).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1080px; height:1350px; overflow:hidden;
    background:#FFFFFF; font-family:'Inter',sans-serif;
    display:flex; flex-direction:column;
    justify-content:space-between;
    padding:90px 88px 72px 88px;
  }
  .rule { width:52px; height:4px; background:#C9A84C; margin-bottom:52px; flex-shrink:0; }
  .content { flex:1; display:flex; flex-direction:column; justify-content:center; }
  p { font-size:${fontSize}; font-weight:900; line-height:1.22; color:#0A0A0A; letter-spacing:-0.8px; margin-bottom:4px; }
  .spacer { height:28px; flex-shrink:0; }
  .footer { display:flex; justify-content:space-between; align-items:center; flex-shrink:0; margin-top:40px; }
  .brand { font-size:14px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C9A84C; }
  .handle { font-size:14px; color:#999; }
</style>
</head>
<body>
  <div class="rule"></div>
  <div class="content">${paras}</div>
  <div class="footer">
    <div class="brand">Illumine Ads</div>
    <div class="handle">@illumineads</div>
  </div>
</body>
</html>`;
}

async function renderImage(lines, isQuip = false) {
  const html = buildHTML(lines, isQuip);
  const tmpDir = os.tmpdir();
  const imgPath = path.join(tmpDir, `illumine_post_${Date.now()}.png`);

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: imgPath, clip: { x:0, y:0, width:1080, height:1350 } });
  await browser.close();

  return imgPath;
}

// ─── GOOGLE DRIVE UPLOAD ─────────────────────────────────────────────────────

async function uploadToDrive(filePath, fileName) {
  // Upload to a dedicated folder
  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // If no folder set, create one
  if (!folderId) {
    const folder = await driveClient.files.create({
      requestBody: { name: "Illumine Posts", mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = folder.data.id;
    console.log(`[DRIVE] Created folder: ${folderId} — add GOOGLE_DRIVE_FOLDER_ID=${folderId} to Vercel env`);
  }

  // Upload file
  const response = await driveClient.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: "image/png", body: fs.createReadStream(filePath) },
    fields: "id",
  });

  const fileId = response.data.id;

  // Make it publicly accessible
  await driveClient.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  // Return direct image URL
  const imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  console.log(`[DRIVE] Uploaded: ${imageUrl}`);
  return imageUrl;
}

// ─── CONTENT GENERATOR ───────────────────────────────────────────────────────

async function generateContent(dayOfWeek) {
  const config = CALENDAR[dayOfWeek];
  const isQuip = dayOfWeek === 6;

  const systemPrompt = `You are writing social media content for M.P.S. Singh, founder of Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion (UK and Dubai).

Voice: sharp, authoritative, direct. No fluff. Specific numbers and mechanisms. Second person. Short sentences. No hedging.

CRITICAL: Return ONLY raw JSON with these exact keys:
- "lines": array of strings for the image. Empty string = paragraph break. Max 14 lines for regular posts, 3 for Sunday quip.
- "caption": full LinkedIn/Instagram caption with hashtags at end (omit hashtags for Sunday)
- "hook": first line only`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: config.prompt }],
  });

  const text = response.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in Claude response");

  const content = JSON.parse(match[0]);
  return { ...content, theme: config.theme, isQuip };
}

// ─── SHEET HELPERS ───────────────────────────────────────────────────────────

async function ensureSheetTabs() {
  const spreadsheet = await sheetsClient.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });
  const existing = spreadsheet.data.sheets.map(s => s.properties.title);

  for (const tab of ["CONTENT_LOG", "ACTIVITY_LOG"]) {
    if (!existing.includes(tab)) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      const headers = tab === "CONTENT_LOG"
        ? ["Date", "Time", "Theme", "Hook", "Caption", "Image_URL", "Status", "Notes"]
        : ["Timestamp", "Event", "Theme", "Status", "Detail"];
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }
  }
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function runAgent() {
  console.log("[AGENT] Starting...");
  await ensureSheetTabs();

  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
  console.log(`[AGENT] Day: ${day} (${CALENDAR[day].theme})`);

  // Generate content
  console.log("[AGENT] Generating content...");
  const content = await generateContent(day);
  console.log(`[AGENT] Hook: ${content.hook}`);

  // Render image
  console.log("[AGENT] Rendering image...");
  const imgPath = await renderImage(content.lines, content.isQuip);
  console.log(`[AGENT] Image rendered: ${imgPath}`);

  // Upload to Drive
  console.log("[AGENT] Uploading to Google Drive...");
  const fileName = `illumine_${now.toISOString().split("T")[0]}_${content.theme.replace(/\s+/g, "_")}.png`;
  const imageUrl = await uploadToDrive(imgPath, fileName);

  // Clean up temp file
  fs.unlinkSync(imgPath);

  // Log to CONTENT_LOG
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toISOString().split("T")[1].substring(0, 5);

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        dateStr, timeStr, content.theme, content.hook,
        content.caption, imageUrl, "READY_TO_POST", ""
      ]],
    },
  });

  // Log to ACTIVITY_LOG
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "ACTIVITY_LOG!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now.toISOString(), "CONTENT_GENERATED", content.theme, "SUCCESS", imageUrl]],
    },
  });

  console.log("[AGENT] Done. Row written to CONTENT_LOG.");
  return { status: 200, theme: content.theme, hook: content.hook, imageUrl };
}

// ─── VERCEL HANDLER ──────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await runAgent();
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AGENT ERROR]", error);
    try {
      const auth2 = new google.auth.GoogleAuth({
        credentials: {
          type: "service_account",
          project_id: process.env.GOOGLE_PROJECT_ID,
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: (process.env.GOOGLE_PRIVATE_KEY || "").split(String.fromCharCode(92,110)).join(String.fromCharCode(10)),
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });
      const sheets2 = google.sheets({ version: "v4", auth: auth2 });
      await sheets2.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "ACTIVITY_LOG!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [[new Date().toISOString(), "ERROR", "UNKNOWN", "FAILED", error.message]] },
      });
    } catch (_) {}
    return res.status(500).json({ error: error.message });
  }
}
