// ─── ILLUMINE ADS IMAGE RENDERING WORKER ─────────────────────────────────────
// Endpoint: /api/render-images?row=N
// Second half of the two-phase batch pipeline. /api/batch generates carousel
// TEXT ONLY (fast, fits in 60s even with web search) and hands off here.
// This endpoint reads the stashed carousel JSON from row N, renders and
// uploads all 7 slide images in PARALLEL, writes the URLs back into that row,
// flips Status to READY, then triggers /api/batch again to continue the week
// if any dates remain ungenerated. This split keeps each invocation well
// under Vercel's 60s Hobby plan ceiling.
// ─────────────────────────────────────────────────────────────────────────────

import { ImageResponse } from "@vercel/og";
import { put } from "@vercel/blob";
import { google } from "googleapis";

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

function getAuth(scopes) {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes,
  });
}

// ─── SLIDE RENDERERS (identical brand system to batch.js) ────────────────────

async function renderTitleSlide(title) {
  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: { width: "1080px", height: "1350px", background: "#FFFFFF", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "100px", fontFamily: "Inter", position: "relative" },
        children: [
          { type: "div", props: { style: { position: "absolute", top: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", top: "40px", left: "100px", fontSize: "22px", fontWeight: "900", color: "#1A1A1A", letterSpacing: "4px", textTransform: "uppercase" }, children: "Illumine Ads" } },
          { type: "div", props: { style: { fontSize: "76px", fontWeight: "900", color: "#1A1A1A", lineHeight: "1.15", maxWidth: "880px" }, children: title } },
          { type: "div", props: { style: { position: "absolute", bottom: "120px", left: "100px", fontSize: "28px", fontWeight: "700", color: "#C9A84C" }, children: "Swipe for the breakdown" } },
          { type: "div", props: { style: { position: "absolute", bottom: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", bottom: "40px", right: "100px", fontSize: "22px", fontWeight: "900", color: "#C9A84C", letterSpacing: "2px" }, children: "1 / 7" } },
        ],
      },
    },
    { width: 1080, height: 1350 }
  );
  return Buffer.from(await imageResponse.arrayBuffer());
}

async function renderPointSlide(number, subheading, summary) {
  const slideLabel = String(number + 1).padStart(2, "0");
  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: { width: "1080px", height: "1350px", background: "#FFFFFF", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "100px", fontFamily: "Inter", position: "relative" },
        children: [
          { type: "div", props: { style: { position: "absolute", top: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", top: "40px", left: "100px", fontSize: "22px", fontWeight: "900", color: "#1A1A1A", letterSpacing: "4px", textTransform: "uppercase" }, children: "Illumine Ads" } },
          { type: "div", props: { style: { fontSize: "120px", fontWeight: "900", color: "#C9A84C", lineHeight: "1", marginBottom: "30px" }, children: slideLabel } },
          { type: "div", props: { style: { fontSize: "56px", fontWeight: "900", color: "#1A1A1A", lineHeight: "1.15", maxWidth: "880px", marginBottom: "30px" }, children: subheading } },
          { type: "div", props: { style: { fontSize: "32px", fontWeight: "500", color: "#1A1A1A", lineHeight: "1.4", maxWidth: "820px" }, children: summary } },
          { type: "div", props: { style: { position: "absolute", bottom: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", bottom: "40px", right: "100px", fontSize: "22px", fontWeight: "900", color: "#C9A84C", letterSpacing: "2px" }, children: `${number + 2} / 7` } },
        ],
      },
    },
    { width: 1080, height: 1350 }
  );
  return Buffer.from(await imageResponse.arrayBuffer());
}

async function renderCTASlide(cta) {
  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: { width: "1080px", height: "1350px", background: "#1A1A1A", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: "100px", fontFamily: "Inter", position: "relative" },
        children: [
          { type: "div", props: { style: { position: "absolute", top: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", top: "40px", left: "100px", fontSize: "22px", fontWeight: "900", color: "#C9A84C", letterSpacing: "4px", textTransform: "uppercase" }, children: "Illumine Ads" } },
          { type: "div", props: { style: { fontSize: "68px", fontWeight: "900", color: "#FFFFFF", lineHeight: "1.2", maxWidth: "880px", marginBottom: "40px" }, children: cta } },
          { type: "div", props: { style: { fontSize: "36px", fontWeight: "700", color: "#C9A84C" }, children: "@illumineads" } },
          { type: "div", props: { style: { position: "absolute", bottom: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", bottom: "40px", right: "100px", fontSize: "22px", fontWeight: "900", color: "#C9A84C", letterSpacing: "2px" }, children: "7 / 7" } },
        ],
      },
    },
    { width: 1080, height: 1350 }
  );
  return Buffer.from(await imageResponse.arrayBuffer());
}

async function uploadToBlob(buffer, fileName) {
  const blob = await put(fileName, buffer, { access: "public", contentType: "image/png", addRandomSuffix: true });
  return blob.url;
}

// Renders and uploads all 7 slides in parallel. Returns array of 7 URLs in order.
async function renderAndUploadCarousel(carousel, dateStr) {
  const timestamp = Date.now();

  const slideJobs = [
    (async () => {
      const buffer = await renderTitleSlide(carousel.title);
      return uploadToBlob(buffer, `illumine-${dateStr}-1-${timestamp}.png`);
    })(),
    ...carousel.points.map((point, i) =>
      (async () => {
        const buffer = await renderPointSlide(i, point.subheading, point.summary);
        return uploadToBlob(buffer, `illumine-${dateStr}-${i + 2}-${timestamp}.png`);
      })()
    ),
    (async () => {
      const buffer = await renderCTASlide(carousel.cta);
      return uploadToBlob(buffer, `illumine-${dateStr}-7-${timestamp}.png`);
    })(),
  ];

  return Promise.all(slideJobs);
}

// ─── SHEET HELPERS ────────────────────────────────────────────────────────────

async function getRowForImageRendering(sheetsClient, rowNumber) {
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `CONTENT_LOG!A${rowNumber}:Q${rowNumber}`,
  });
  const row = res.data.values?.[0];
  if (!row) throw new Error(`Row ${rowNumber} not found`);
  const dateStr = row[0];
  const rawJson = row[16];
  if (!rawJson) throw new Error(`Row ${rowNumber} has no raw_json to render images from`);
  const carousel = JSON.parse(rawJson);
  return { dateStr, carousel };
}

async function updateRowWithImages(sheetsClient, rowNumber, imageUrls) {
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `CONTENT_LOG!G${rowNumber}:Q${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        imageUrls[0], imageUrls[1], imageUrls[2], imageUrls[3], imageUrls[4], imageUrls[5], imageUrls[6],
        "READY", "Weekly carousel batch", "", "",
      ]],
    },
  });
}

function getNextWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + daysUntilMonday + i);
    dates.push({ dateStr: d.toISOString().split("T")[0] });
  }
  return dates;
}

async function getExistingReadyDates(sheetsClient) {
  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "CONTENT_LOG!A:A",
    });
    const rows = res.data.values || [];
    const dates = new Set();
    rows.forEach((row, i) => { if (i > 0 && row[0]) dates.add(row[0]); });
    return dates;
  } catch { return new Set(); }
}

// ─── SELF-CHAIN BACK TO /api/batch ────────────────────────────────────────────

async function triggerChain(req, path) {
  try {
    const host = req.headers.host || process.env.VERCEL_URL;
    const protocol = host?.includes("localhost") ? "http" : "https";
    const selfUrl = `${protocol}://${host}${path}`;
    const chainPromise = fetch(selfUrl).catch((err) => console.error(`[CHAIN] Trigger to ${path} failed:`, err.message));
    await Promise.race([chainPromise, new Promise((resolve) => setTimeout(resolve, 800))]);
    console.log(`[CHAIN] Triggered ${path}`);
  } catch (err) {
    console.error(`[CHAIN] Could not trigger ${path}:`, err.message);
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rowNumber = parseInt(req.query?.row);
  if (!rowNumber) {
    return res.status(400).json({ error: "Missing or invalid ?row= query parameter" });
  }

  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetsClient = google.sheets({ version: "v4", auth });

  try {
    console.log(`[RENDER] Rendering images for row ${rowNumber}...`);

    const { dateStr, carousel } = await getRowForImageRendering(sheetsClient, rowNumber);
    const imageUrls = await renderAndUploadCarousel(carousel, dateStr);
    await updateRowWithImages(sheetsClient, rowNumber, imageUrls);

    console.log(`[RENDER] Row ${rowNumber} (${dateStr}) images done. Status set to READY.`);

    // Check if more dates remain for the week. If so, continue the chain
    // back to /api/batch to generate the next post's text.
    const weekDates = getNextWeekDates();
    const existingDates = await getExistingReadyDates(sheetsClient);
    const stillPending = weekDates.some((d) => !existingDates.has(d.dateStr));

    if (stillPending) {
      await triggerChain(req, "/api/batch");
    }

    return res.status(200).json({
      success: true,
      row: rowNumber,
      date: dateStr,
      image_urls: imageUrls,
      chain_continued: stillPending,
      message: stillPending
        ? `Images done for row ${rowNumber}. Next post's text generation triggered.`
        : `Images done for row ${rowNumber}. All 7 posts for the week are now complete.`,
    });

  } catch (err) {
    console.error("[RENDER] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
