/**
 * ILLUMINE ADS AGENT v3
 * Uses @vercel/og (Satori) for image rendering - no Chromium, works on Hobby plan
 *
 * Pipeline: Generate content → Render PNG → Upload to Vercel Blob → Log to Sheet
 * Make.com then reads the sheet and posts via Buffer
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import { ImageResponse } from "@vercel/og";
import { put } from "@vercel/blob";

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

function getCalendar() {
  const today = new Date();
  const dateString = today.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    0: {
      theme: "Platform News",
      prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, fashion (UK + Dubai).

Today's date is ${dateString}.

Use web search to find a REAL Meta Ads or Google Ads platform change announced in the last 14 days. Do not reference anything older than that. If nothing genuinely new exists, write a neuromarketing post instead — never fabricate or use stale news.

Structure the post exactly like this:
- Line 1: Name the specific change and when it happened — no vague intros, no "here's what changed"
- Lines 2–3: Explain what mechanically changed inside a D2C ad account — use real ad account language (CPMs, ROAS, attribution windows, Advantage+, etc.)
- "Three things to do this week:" followed by 3 numbered, specific actions — name the platform, the setting, or the tool
- Final line: The deeper truth most coverage missed — what this really signals about where Meta or Google is heading

Voice: sharp, authoritative, second person. No fluff. No generic advice. Every sentence earns its place.

Return ONLY raw JSON:
{"lines": ["line1", "line2"], "caption": "full post text with hashtags", "hook": "first line only"}`
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
{"lines": ["line1", "line2"], "caption": "full caption with hashtags", "hook": "first line only"}`
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
{"lines": ["line1", "line2"], "caption": "full caption with hashtags", "hook": "first line only"}`
    },
    3: {
      theme: "Platform News",
      prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, fashion (UK + Dubai).

Today's date is ${dateString}.

Use web search to find a REAL Meta Ads or Google Ads platform change announced in the last 14 days — focus on creative tools, Advantage+ changes, measurement updates, or Shopping features. Do not reference anything older than 14 days. If nothing genuinely new exists, write a consumer psychology post instead — never fabricate or use stale news.

Structure the post exactly like this:
- Line 1: Name the specific change and when it happened — no vague intros
- Lines 2–3: Explain what mechanically changed and what it means for D2C ad spend
- "Three things to do this week:" followed by 3 numbered, specific actions — name the platform, the setting, or the tool
- Final line: Honest assessment including the limitation or risk most coverage glosses over

Voice: sharp, authoritative, second person. No fluff.

Return ONLY raw JSON:
{"lines": ["line1", "line2"], "caption": "full post text with hashtags", "hook": "first line only"}`
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
{"lines": ["line1", "line2"], "caption": "full caption with hashtags", "hook": "first line only"}`
    },
    5: {
      theme: "AI in Marketing",
      prompt: `You are writing for M.P.S. Singh, founder of Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders.

Write a PRACTICAL how-to post showing a D2C founder one concrete way to use AI (Claude, ChatGPT, or similar) in their day-to-day marketing work. This is a tactical tip they can act on today — NOT industry news, NOT a product announcement, NOT a "what just launched" story. Do not reference dated events or version releases.

Pick ONE specific, useful workflow, for example:
- Generating a weekly Meta Ads performance report from exported CSV data
- Drafting 10 ad copy variations from one winning angle
- Turning customer reviews into hook ideas for new creative
- Building a simple prompt that audits a landing page for friction

Structure:
- Open with the specific task and why doing it manually wastes their time
- Walk through exactly how to do it with AI — be concrete about the tool, the inputs, and a sample prompt or step
- Note one thing to watch out for (where AI gets it wrong)
- End with the payoff: what they get back (time, clarity, more tests)
- Voice: sharp, authoritative, second person, specific. No fluff, no hype.

Return ONLY raw JSON:
{"lines": ["line1", "line2"], "caption": "full caption with hashtags", "hook": "first line only"}`
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
}

// ─── IMAGE TEXT RULE (appended to every prompt) ───────────────────────────────

const IMAGE_TEXT_RULE = `

────────────────────────
CRITICAL OUTPUT RULE — READ CAREFULLY:

"lines" is the text PRINTED ON THE IMAGE. It is NOT the post body.
It must be EXACTLY 2 short lines, readable from a phone thumbnail:
- Exactly 2 lines (no more, no fewer)
- Each line maximum 7 words
- Together they form ONE punchy hook — never the full explanation
- Do NOT include empty-string entries; just two strings

"caption" holds the FULL post — all the detail, context, and hashtags.
"hook" is the single strongest line, repeated from "lines".

If "lines" has more than 2 entries, you are doing it wrong.
Return ONLY raw JSON, no markdown, no backticks.
────────────────────────`;

// ─── IMAGE RENDERER ───────────────────────────────────────────────────────────

async function renderImage(lines, isQuip = false) {
  lines = lines.filter((l) => l && l.trim() !== "").slice(0, 2);

  const fontSize = 60;
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
            fontFamily: "Inter", flexShrink: 0
          },
          children: line
        }
      });
    }
  }

  children.push({
    type: "div",
    props: {
      style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" },
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

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── VERCEL BLOB UPLOAD ───────────────────────────────────────────────────────

async function uploadToBlob(buffer, fileName) {
  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });
  return blob.url;
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
  const CALENDAR = getCalendar();
  const config = CALENDAR[day];
  const isQuip = day === 6;
  const isPlatformNews = day === 0 || day === 3;

  console.log(`[AGENT] Day ${day}: ${config.theme}`);

  const POST_TOOL = {
    name: "create_post",
    description: "Return the finished social media post content.",
    input_schema: {
      type: "object",
      properties: {
        lines: {
          type: "array",
          items: { type: "string" },
          description: "EXACTLY 2 short lines for the image. Each line max 7 words. Together they form one punchy hook.",
        },
        caption: {
          type: "string",
          description: "The full post caption, including hashtags.",
        },
        hook: {
          type: "string",
          description: "The single strongest line, repeated from lines.",
        },
      },
      required: ["lines", "caption", "hook"],
    },
  };

  // Platform News days use web search so Claude finds real recent developments.
  // All other days force create_post directly — no search needed.
  const tools = isPlatformNews
    ? [{ type: "web_search_20260209", name: "web_search" }, POST_TOOL]
    : [POST_TOOL];

  const tool_choice = isPlatformNews
    ? { type: "auto" }
    : { type: "tool", name: "create_post" };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    tools,
    tool_choice,
    messages: [{ role: "user", content: config.prompt + IMAGE_TEXT_RULE }],
  });

  // On Platform News days Claude runs web search first, then calls create_post.
  // On all other days the only tool_use block is create_post.
  const toolUse = response.content.find(
    (b) => b.type === "tool_use" && b.name === "create_post"
  );
  if (!toolUse) throw new Error("No structured output returned from the model.");
  const content = toolUse.input;
  console.log(`[AGENT] Hook: ${content.hook}`);

  // Render image
  console.log("[AGENT] Rendering image...");
  const imgBuffer = await renderImage(content.lines, isQuip);

  // Upload to Vercel Blob
  console.log("[AGENT] Uploading to Blob...");
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `illumine_${dateStr}_${config.theme.replace(/\s+/g, "_")}.png`;
  const imageUrl = await uploadToBlob(imgBuffer, fileName);
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
