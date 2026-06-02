/**
 * VERCEL SERVERLESS FUNCTION - ILLUMINE AGENT
 * Endpoint: /api/agent
 * Triggered by cron job daily at 08:00 UTC
 * Generates content, posts to Buffer, logs to Google Sheets
 * NO APPROVAL REQUIRED - Posts go live automatically
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import fetch from "node-fetch";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheetsClient = google.sheets({ version: "v4", auth });

/**
 * Auto-create Google Sheet tabs if they don't exist
 */
async function ensureSheetTabs() {
  console.log("[SHEETS] Checking for required tabs...");

  try {
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
                    gridProperties: {
                      rowCount: 1000,
                      columnCount: 10,
                    },
                  },
                },
              },
            ],
          },
        });

        // Add headers
        const headers =
          tabName === "CONTENT_LOG"
            ? [
                "Date",
                "Platform",
                "Text",
                "Posted_At",
                "Status",
                "Buffer_ID",
              ]
            : ["Timestamp", "Event", "Details", "Status"];

        await sheetsClient.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${tabName}!A1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [headers],
          },
        });

        console.log(`[SHEETS] Tab created with headers: ${tabName}`);
      }
    }
  } catch (error) {
    console.error("[SHEETS] Error ensuring tabs:", error);
    throw error;
  }
}

/**
 * Post to Buffer API
 */
async function postToBuffer(platform, text) {
  console.log(`[BUFFER] Posting to ${platform}...`);

  try {
    const profileId =
      platform === "linkedin"
        ? process.env.BUFFER_LINKEDIN_PROFILE_ID
        : process.env.BUFFER_INSTAGRAM_PROFILE_ID;

    const response = await fetch(
      "https://api.bufferapp.com/1/updates/create.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text,
          profile_ids: [profileId],
          access_token: process.env.BUFFER_ACCESS_TOKEN,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Buffer API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[BUFFER] Posted to ${platform}: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`[BUFFER] Error posting to ${platform}:`, error);
    throw error;
  }
}

/**
 * Main agent logic
 */
async function runAgent() {
  console.log("[AGENT] Starting Illumine social media agent...");

  try {
    // Step 0: Ensure sheet tabs exist
    await ensureSheetTabs();

    // Step 1: Generate content using Claude
    console.log("[AGENT] Generating content with Claude...");
    const contentPrompt = `Generate 2 distinct social media posts for D2C founders about paid marketing psychology.

Post 1 (LinkedIn - professional, ~280 chars):
- Focus on psychology/behavioral economics insight
- Include research reference
- Professional tone

Post 2 (Instagram - engaging, ~150 chars):
- Same psychology insight but more conversational
- Include relevant hashtags
- Engaging/conversational tone

Format response as JSON with keys: linkedin_text, instagram_text`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250805",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: contentPrompt,
        },
      ],
    });

    const generatedText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse response
    let content = { linkedin_text: "", instagram_text: "" };
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log("[AGENT] Using raw text response");
      content = {
        linkedin_text: generatedText.substring(0, 280),
        instagram_text: generatedText.substring(0, 150),
      };
    }

    console.log("[AGENT] Content generated:");
    console.log("  LinkedIn:", content.linkedin_text);
    console.log("  Instagram:", content.instagram_text);

    // Step 2: Post to Buffer (NO APPROVAL REQUIRED - AUTOMATIC)
    console.log("[AGENT] Posting to Buffer (automatic, no approval needed)...");
    const linkedinPostId = await postToBuffer("linkedin", content.linkedin_text);
    const instagramPostId = await postToBuffer(
      "instagram",
      content.instagram_text
    );

    const now = new Date().toISOString();

    // Step 3: Log to CONTENT_LOG
    console.log("[AGENT] Logging content to CONTENT_LOG...");
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "CONTENT_LOG!A:F",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            new Date().toISOString().split("T")[0],
            "LinkedIn",
            content.linkedin_text,
            now,
            "POSTED",
            linkedinPostId,
          ],
          [
            new Date().toISOString().split("T")[0],
            "Instagram",
            content.instagram_text,
            now,
            "POSTED",
            instagramPostId,
          ],
        ],
      },
    });

    // Step 4: Log activity
    console.log("[AGENT] Logging activity...");
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "ACTIVITY_LOG!A:D",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            now,
            "CONTENT_GENERATED_AND_POSTED",
            "LinkedIn + Instagram posted automatically",
            "SUCCESS",
          ],
        ],
      },
    });

    console.log("[AGENT] Agent execution completed successfully");

    return {
      status: 200,
      message: "Content generated and posted successfully",
      content: content,
      bufferIds: { linkedin: linkedinPostId, instagram: instagramPostId },
    };
  } catch (error) {
    console.error("[AGENT ERROR]", error);

    // Log error to sheet
    try {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "ACTIVITY_LOG!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              new Date().toISOString(),
              "ERROR",
              error.message,
              "FAILED",
            ],
          ],
        },
      });
    } catch (logError) {
      console.error("[AGENT] Could not log error to sheet:", logError);
    }

    return {
      status: 500,
      message: "Agent execution failed",
      error: error.message,
    };
  }
}

/**
 * Vercel serverless function handler
 */
export default async function handler(req, res) {
  console.log(`[${new Date().toISOString()}] API Request:`, req.method);

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Run the agent
  const result = await runAgent();

  return res.status(result.status).json(result);
}
