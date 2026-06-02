/**
 * VERCEL SERVERLESS FUNCTION - ILLUMINE AGENT
 * Endpoint: /api/agent
 * Triggered by cron job daily at 08:00 UTC
 * 
 * Flow:
 * 1. Auto-creates CONTENT_LOG and ACTIVITY_LOG tabs in Google Sheet
 * 2. Generates diverse D2C content using Claude
 * 3. Posts to Buffer with UTM tracking
 * 4. LinkedIn post goes live at 17:00 UTC
 * 5. Instagram post goes live at 19:00 UTC (+ bio link logged)
 * 6. All activity logged to Google Sheet for analytics
 * 
 * NO APPROVAL REQUIRED - Posts go live automatically
 */

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";
import BufferPostingService from "./buffer-service.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize Google Sheets
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheetsClient = google.sheets({ version: "v4", auth });
const bufferService = new BufferPostingService(process.env.BUFFER_ACCESS_TOKEN);

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
                      columnCount: 15,
                    },
                  },
                },
              },
            ],
          },
        });

        // Add headers based on tab type
        const headers =
          tabName === "CONTENT_LOG"
            ? [
                "Date",
                "Time",
                "Platform",
                "Content_Theme",
                "Text",
                "Buffer_ID",
                "Scheduled_At",
                "Status",
                "LinkedIn_UTM_URL",
                "Instagram_Bio_Link",
                "Notes",
              ]
            : [
                "Timestamp",
                "Event",
                "Content_Theme",
                "Platform",
                "Details",
                "UTM_Campaign",
                "Buffer_ID",
                "Status",
              ];

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
 * Main agent logic
 */
async function runAgent() {
  console.log("[AGENT] Starting Illumine social media agent...");

  try {
    // Step 0: Ensure sheet tabs exist
    await ensureSheetTabs();

    // Step 1: Select content theme for today
    const contentThemes = [
      {
        name: "Psychology",
        campaign: "consumer-psychology",
        description:
          "Consumer psychology, behavioral economics, neuromarketing insights for D2C paid ads",
      },
      {
        name: "Paid Ads Strategy",
        campaign: "meta-google-ads",
        description:
          "Meta Ads, Google Ads, LinkedIn Ads optimization tips, attribution, bidding strategies",
      },
      {
        name: "D2C Scaling",
        campaign: "d2c-scaling",
        description:
          "D2C growth frameworks, unit economics, customer retention, scaling strategies",
      },
      {
        name: "Creative Strategy",
        campaign: "creative-strategy",
        description:
          "Ad creative best practices, copywriting for conversion, creative testing frameworks",
      },
      {
        name: "Case Study",
        campaign: "case-study",
        description:
          "Anonymized D2C brand case studies - what worked, results, lessons learned",
      },
    ];

    const todayTheme =
      contentThemes[Math.floor(Math.random() * contentThemes.length)];
    console.log("[AGENT] Today's content theme:", todayTheme.name);

    // Step 2: Generate content using Claude
    console.log("[AGENT] Generating content with Claude...");

    const contentPrompt = `Generate 2 distinct social media posts for D2C founders about: ${todayTheme.description}

Post 1 (LinkedIn - professional, ~280 chars):
- Deep insight or framework related to ${todayTheme.name}
- Include research reference or real example
- Professional tone
- Actionable for D2C founders

Post 2 (Instagram - engaging, ~150 chars):
- Same core insight but more conversational
- Include relevant hashtags (2-3 max)
- Engaging/punchy tone
- Include call-to-action

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

    // Step 3: Post to Buffer with UTM tracking
    console.log("[AGENT] Posting to Buffer with UTM tracking...");

    const bufferContent = {
      text: content.linkedin_text, // Will be used for LinkedIn
      utmOptions: {
        destination: "vault", // You can change this to 'home', 'apply', 'veritashire'
        campaign: todayTheme.campaign,
        contentType: "text",
      },
    };

    const now = new Date();
    const linkedinTime = "17:00"; // 17:00 UTC
    const instagramTime = "19:00"; // 19:00 UTC

    // Post LinkedIn with full post text
    const linkedinContent = {
      text: content.linkedin_text,
      utmOptions: bufferContent.utmOptions,
    };

    // Post Instagram with Instagram-specific text
    const instagramContent = {
      text: content.instagram_text,
      utmOptions: bufferContent.utmOptions,
    };

    const linkedinResult = await bufferService.postToLinkedIn(
      linkedinContent,
      bufferService.getScheduledTime(linkedinTime)
    );

    const instagramResult = await bufferService.postToInstagram(
      instagramContent,
      bufferService.getScheduledTime(instagramTime)
    );

    const timestamp = now.toISOString();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toISOString().split("T")[1].substring(0, 5);

    // Step 4: Log to CONTENT_LOG
    console.log("[AGENT] Logging content to CONTENT_LOG...");
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "CONTENT_LOG!A:K",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            dateStr,
            timeStr,
            "LinkedIn",
            todayTheme.name,
            content.linkedin_text,
            linkedinResult?.id || "ERROR",
            linkedinResult?.scheduledAt || "FAILED",
            "POSTED",
            linkedinResult?.taggedURL || "N/A",
            "N/A",
            `Campaign: ${todayTheme.campaign}`,
          ],
          [
            dateStr,
            timeStr,
            "Instagram",
            todayTheme.name,
            content.instagram_text,
            instagramResult?.id || "ERROR",
            instagramResult?.scheduledAt || "FAILED",
            "POSTED",
            "N/A",
            instagramResult?.bioLink || "N/A",
            `Campaign: ${todayTheme.campaign} | Update bio with link`,
          ],
        ],
      },
    });

    // Step 5: Log activity
    console.log("[AGENT] Logging activity...");
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "ACTIVITY_LOG!A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            timestamp,
            "CONTENT_GENERATED_AND_POSTED",
            todayTheme.name,
            "LinkedIn + Instagram",
            "Posts scheduled with UTM tracking",
            todayTheme.campaign,
            `LI: ${linkedinResult?.id} | IG: ${instagramResult?.id}`,
            "SUCCESS",
          ],
        ],
      },
    });

    console.log("[AGENT] Agent execution completed successfully");
    console.log("\n[UTM SUMMARY FOR ANALYTICS]");
    console.log(`LinkedIn  → ${linkedinResult?.taggedURL}`);
    console.log(
      `Instagram → ${instagramResult?.bioLink} (update bio before post goes live)`
    );

    return {
      status: 200,
      message: "Content generated and posted successfully",
      theme: todayTheme.name,
      content: content,
      bufferIds: { linkedin: linkedinResult?.id, instagram: instagramResult?.id },
      utmUrls: {
        linkedin: linkedinResult?.taggedURL,
        instagram: instagramResult?.bioLink,
      },
    };
  } catch (error) {
    console.error("[AGENT ERROR]", error);

    // Log error to sheet
    try {
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "ACTIVITY_LOG!A:H",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            [
              new Date().toISOString(),
              "ERROR",
              "UNKNOWN",
              "N/A",
              error.message,
              "N/A",
              "N/A",
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
