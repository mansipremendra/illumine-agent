/**
 * ILLUMINE ADS AGENT v3
 * Uses @vercel/og (Satori) for image rendering - no Chromium, works on Hobby plan
 * 
 * Pipeline: Generate content → Render PNG → Upload to Drive → Log to Sheet
 * Make.com then reads the sheet and posts via Buffer
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { ImageResponse } from "@vercel/og";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── AUTH ─────────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getAuth(scopes) {
  return new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "")
        .split(String.fromCharCode(92, 110))
        .join(String.fromCharCode(10)),
    },
    scopes,
  });
}

// ─── CONTENT CALENDAR ─────────────────────────────────────────────────────────

const CALENDAR = {
  0: {
    theme: "Platform News",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, fashion (UK + Dubai).

Write a post about a real, specific Meta Ads or Google Ads development from recent weeks.
- Open with the exact change and approximate date
- Explain the mechanical impact on a D2C ad account  
- Give one concrete action for this week
- End with a line showing deeper understanding than most coverage
- Voice: sharp, authoritative, second person, no fluff, specific numbers

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  1: {
    theme: "Neuromarketing",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads.

Write a post about a specific named neuromarketing principle (Von Restorff Effect, Scarcity Heuristic, Dual Process Theory, Anchoring, Loss Aversion, etc.)
- Open with the principle name and a surprising implication  
- Explain why the brain behaves this way
- Show exactly how a D2C beauty/supplements/fashion brand applies this in Meta ads
- Specify which creative element changes and how
- Voice: sharp, authoritative, second person, specific

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  2: {
    theme: "Consumer Psychology",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads.

Write a post about a specific consumer psychology framework or buying behaviour pattern.
Use real frameworks: Jobs To Be Done, Identity-Based Purchasing, Endowment Effect, Paradox of Choice, etc.
- Open with a behaviour founders notice but never understand
- Explain the psychological mechanism
- Show how to use it in ad creative, landing page, or offer
- Give one implementable change this week
- Voice: sharp, authoritative, second person

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  3: {
    theme: "Platform News",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads.

Write a post about a specific Meta Ads or Google Ads development — focus on creative tools, Advantage+ changes, measurement updates, or Shopping features.
- Open with the specific change and date
- Explain what mechanically changed  
- Tell a D2C founder what this means for their spend
- End with honest assessment including limitations most coverage ignores
- Voice: sharp, authoritative, second person

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  4: {
    theme: "Funnel Optimisation",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads.

Write a post about a specific funnel stage or conversion fix for D2C brands.
Pick one: awareness hook rate, landing page friction, checkout abandonment, post-purchase retention, or retargeting.
- Open with a specific surprising stat about where D2C brands lose money
- Explain the real reason it happens
- Give a step-by-step fix implementable this week  
- Be specific about platform, tool, or setting
- Voice: sharp, authoritative, second person

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  5: {
    theme: "AI in Marketing",
    prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads.

Write a post about a specific AI development and its real impact on paid marketing.
- Open with what specifically launched or changed, and when
- Explain what it actually does vs the press release version
- Tell a D2C founder what this means for their workflow
- Be honest about limitations
- End with: worth attention now or in 6 months?
- Voice: sharp, authoritative, second person

Return ONLY raw JSON:
{"lines": ["line1", "", "line2 after break"], "caption": "full caption with hashtags", "hook": "first line only"}`
  },
  6: {
    theme: "Sunday Quip",
    prompt: `Write a single genuinely funny 2-3 line observation about marketing, consumer psychology, human behaviour, or AI.
Makes a marketer laugh because it's true. No hashtags. No emojis.
The kind of thing someone screenshots and sends to their team.

Return ONLY raw JSON:
{"lines": ["line1", "line2"], "caption": "same text, no hashtags", "hook": "first line only"}`
  }
};

// ─── IMAGE RENDERER ───────────────────────────────────────────────────────────

async function renderImage(lines, isQuip = false) {
  const fontSize = isQuip ? 52 : 42;

  // Build children array for Satori
  const children = [];

  // Gold rule
  children.push({
    type: "div",
    props: {
      style: { width: 52, height: 4, background: "#C9A84C", marginBottom: 52, flexShrink: 0 }
    }
  });

  // Content area
  const contentChildren = [];
  for (const line of lines) {
    if (line.trim() === "") {
      contentChildren.push({
        type: "div",
        props: { style: { height: 28, flexShrink: 0 } }
      });
    } else {
      contentChildren.push({
        type: "p",
        props: {
          style: {
            fontSize, fontWeight: 900, lineHeight: 1.22,
            color: "#0A0A0A", letterSpacing: -0.8, marginBottom: 4,
            fontFamily: "Inter"
          },
          children: line
        }
      });
    }
  }

  children.push({
    type: "div",
    props: {
      style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" },
      children: contentChildren
    }
  });

  // Footer
  children.push({
    type: "div",
    props: {
      style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, marginTop: 40 },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: 14, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#C9A84C" },
            children: "Illumine Ads"
          }
        },
        {
          type: "div",
          props: { style: { fontSize: 14, color: "#999" }, children: "@illumineads" }
        }
      ]
    }
  });

  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: 1080, height: 1350, background: "#FFFFFF",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "90px 88px 72px 88px", fontFamily: "Inter"
        },
        children
      }
    },
    { width: 1080, height: 1350 }
  );

  // Convert to buffer
  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpPath = path.join(os.tmpdir(), `illumine_${Date.now()}.png`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

// ─── GOOGLE DRIVE UPLOAD ──────────────────────────────────────────────────────

async function uploadToDrive(filePath, fileName) {
  const auth = getAuth(["https://www.googleapis.com/auth/drive"]);
  const drive = google.drive({ version: "v3", auth });

  let folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    const folder = await drive.files.create({
      requestBody: { name: "Illumine Posts", mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = folder.data.id;
    console.log(`[DRIVE] Created folder ID: ${folderId} — add this as GOOGLE_DRIVE_FOLDER_ID in Vercel`);
  }

  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: "image/png", body: fs.createReadStream(filePath) },
    fields: "id",
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  fs.unlinkSync(filePath);
  return `https://drive.google.com/uc?export=view&id=${file.data.id}`;
}

// ─── SHEETS HELPER ────────────────────────────────────────────────────────────

async function ensureSheetTabs() {
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const existing = spreadsheet.data.sheets.map(s => s.properties.title);

  for (const tab of ["CONTENT_LOG", "ACTIVITY_LOG"]) {
    if (!existing.includes(tab)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      const headers = tab === "CONTENT_LOG"
        ? ["Date", "Time", "Theme", "Hook", "Caption", "Image_URL", "Status", "Notes"]
        : ["Timestamp", "Event", "Theme", "Status", "Detail"];
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }
  }
  return { sheets };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function runAgent() {
  console.log("[AGENT] Starting Illumine Ads agent v3...");

  const { sheets } = await ensureSheetTabs();
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetsClient = google.sheets({ version: "v4", auth });

  const now = new Date();
  const day = now.getUTCDay();
  const config = CALENDAR[day];
  const isQuip = day === 6;

  console.log(`[AGENT] Day ${day}: ${config.theme}`);

  // Generate content
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: config.prompt }],
  });

  const text = response.content[0].text;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`No JSON in response: ${text.substring(0, 200)}`);
  const content = JSON.parse(match[0]);
  console.log(`[AGENT] Hook: ${content.hook}`);

  // Render image
  console.log("[AGENT] Rendering image...");
  const imgPath = await renderImage(content.lines, isQuip);

  // Upload to Drive
  console.log("[AGENT] Uploading to Drive...");
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `illumine_${dateStr}_${config.theme.replace(/\s+/g, "_")}.png`;
  const imageUrl = await uploadToDrive(imgPath, fileName);
  console.log(`[AGENT] Image URL: ${imageUrl}`);

  // Log to sheet
  const timeStr = now.toISOString().split("T")[1].substring(0, 5);

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[dateStr, timeStr, config.theme, content.hook, content.caption, imageUrl, "READY_TO_POST", ""]],
    },
  });

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "ACTIVITY_LOG!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[now.toISOString(), "CONTENT_GENERATED", config.theme, "SUCCESS", imageUrl]],
    },
  });

  console.log("[AGENT] Complete.");
  return { status: 200, theme: config.theme, hook: content.hook, imageUrl };
}

// ─── VERCEL HANDLER ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await runAgent();
    return res.status(200).json(result);
  } catch (error) {
    console.error("[AGENT ERROR]", error.message);
    return res.status(500).json({ error: error.message });
  }
}
