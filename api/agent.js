// ─── ILLUMINE ADS SOCIAL MEDIA AGENT v4 ──────────────────────────────────────
// 90-day topic rotation system. No topic repeats for 13 weeks per content type.
// TOPIC_STATE tab in Google Sheet tracks indexes across runs.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { ImageResponse } from "@vercel/og";
import { put } from "@vercel/blob";
import { google } from "googleapis";

// ─── 90-DAY TOPIC BANKS ───────────────────────────────────────────────────────
// Each array = 13 entries (covers 13 weeks / ~91 days of that weekday).
// Indexes cycle: when end is reached, wraps back to 0.

const NEUROMARKETING_TOPICS = [
  {
    topic: "The Von Restorff Effect",
    angle: "Why the one thing that looks different in your ad set gets 3x the clicks — and how to engineer it deliberately in creative",
  },
  {
    topic: "The Zeigarnik Effect",
    angle: "Unfinished stories hold attention longer than completed ones. Here's how to use open loops in ad copy to stop the scroll",
  },
  {
    topic: "The Mere Exposure Effect",
    angle: "Your audience needs to see your brand 7+ times before they trust it. Retargeting isn't annoying — it's neuroscience",
  },
  {
    topic: "Loss Aversion",
    angle: "Losses feel 2x more powerful than equivalent gains. Why 'don't miss out' outperforms 'get access to' in D2C copy every time",
  },
  {
    topic: "The Anchoring Effect",
    angle: "The first number your buyer sees sets the reference point for every price that follows. Most D2C brands anchor wrong",
  },
  {
    topic: "Social Proof Cascades",
    angle: "Why showing 1,000 reviews converts worse than showing 3 highly specific ones — and the mechanism behind it",
  },
  {
    topic: "The Peak-End Rule",
    angle: "People don't remember the whole ad. They remember the emotional peak and the final frame. Are you designing for that?",
  },
  {
    topic: "Scarcity vs. Urgency",
    angle: "Scarcity is about supply. Urgency is about time. They trigger different neural pathways and D2C brands confuse them constantly",
  },
  {
    topic: "The Bizarreness Effect",
    angle: "Unusual, unexpected creative is encoded in memory more deeply than polished, safe creative. The science of being weird on purpose",
  },
  {
    topic: "Cognitive Fluency",
    angle: "The easier your ad is to process, the more trustworthy your brand feels. Why complex creative hurts conversion even when it looks premium",
  },
  {
    topic: "The Decoy Effect",
    angle: "Adding a strategically priced third option makes your target offer look like the obvious choice. Used in every high-converting offer page",
  },
  {
    topic: "Embodied Cognition",
    angle: "Physical sensations in your creative (texture, warmth, weight) activate the same brain regions as real touch. Beauty brands leaving money here",
  },
  {
    topic: "The Pratfall Effect",
    angle: "Admitting a small flaw makes your brand more likeable and credible, not less. Counter-intuitive copy principle most D2C brands are too scared to use",
  },
];

const CONSUMER_PSYCHOLOGY_TOPICS = [
  {
    topic: "Identity-Based Buying",
    angle: "People don't buy products. They buy who they want to become. How to position your D2C brand as an identity signal, not a commodity",
  },
  {
    topic: "The Paradox of Choice",
    angle: "More SKUs on your product page reduce conversion. Schwartz's paradox applied to D2C catalogues — and the fix",
  },
  {
    topic: "Pain Points vs. Aspirations",
    angle: "Pain-led copy converts colder traffic. Aspiration-led copy converts warmer traffic. Most brands run the same angle at every funnel stage",
  },
  {
    topic: "Tribe Signalling in Beauty",
    angle: "Why premium beauty buyers are paying for belonging, not ingredients. The psychology of 'cult brand' status and how to engineer it",
  },
  {
    topic: "The Endowment Effect",
    angle: "Once someone feels like something is theirs, they value it more. How free trials, quizzes, and customisation exploit this in D2C",
  },
  {
    topic: "Emotional vs. Rational Decisions",
    angle: "The emotional brain decides first, the rational brain justifies after. Your product page copy is probably arguing with the wrong one",
  },
  {
    topic: "Status and Luxury Signalling",
    angle: "Luxury buyers are not buying quality. They are buying the social signal. Why price increases can actually lift demand in premium D2C",
  },
  {
    topic: "The Sunk Cost Fallacy",
    angle: "Buyers who've spent anything — time, money, attention — are more likely to convert again. Subscription and loyalty mechanics built on this",
  },
  {
    topic: "Fear of Missing Out vs. Joy of Missing Out",
    angle: "FOMO is overused. JOMO (curated restraint) is what premium brands use to create desire. The psychology of limited access",
  },
  {
    topic: "Narrative Transportation",
    angle: "When buyers get absorbed in a brand story, their critical thinking lowers and emotional connection rises. Storytelling as a conversion mechanism",
  },
  {
    topic: "Ritual and Habit Formation",
    angle: "Products embedded into daily rituals have higher LTV. How to design your product experience so it becomes a habit, not a purchase",
  },
  {
    topic: "The Default Effect",
    angle: "Whatever is pre-selected becomes the most chosen option. How subscription D2C brands use defaults to increase AOV and retention",
  },
  {
    topic: "Trust Signals and Authority Bias",
    angle: "Consumers defer to perceived experts. Why clinical language, founder credentials, and press logos outperform testimonials in cold traffic",
  },
];

const FUNNEL_OPTIMISATION_TOPICS = [
  {
    topic: "Hook Rate vs. Hold Rate",
    angle: "Hook rate (3-sec views/impressions) tells you if the first frame works. Hold rate tells you if the story holds. Most brands only check one",
  },
  {
    topic: "Landing Page Cognitive Load",
    angle: "Every extra element on a landing page is a decision your buyer has to make. Reducing cognitive load is the fastest conversion lever most brands ignore",
  },
  {
    topic: "The Checkout Abandonment Stack",
    angle: "74% of carts are abandoned. The causes are layered — friction, trust gaps, shipping cost shock. Fixing one without the others moves nothing",
  },
  {
    topic: "Frequency Capping and Ad Fatigue",
    angle: "What frequency is too high? The answer is different for cold, warm, and hot audiences — and most accounts use one blanket cap for all three",
  },
  {
    topic: "Offer Architecture",
    angle: "Most D2C brands have a product. Fewer have an offer. The difference — risk reversal, bundling, urgency, bonus stacking — is the entire gap between 1x and 4x ROAS",
  },
  {
    topic: "The Thank You Page as a Revenue Channel",
    angle: "Post-purchase is the highest-trust moment in the entire funnel. Most brands waste it with a basic confirmation. Here's what to put there instead",
  },
  {
    topic: "Audience Segmentation Beyond Demographics",
    angle: "Age and gender targeting is 2019. Behavioural, intent, and psychographic segmentation is where the arbitrage is in 2026 Meta accounts",
  },
  {
    topic: "Creative Velocity",
    angle: "The brands winning on Meta are testing 10–15 new creatives per week, not perfecting 2. Creative velocity beats creative quality at cold traffic scale",
  },
  {
    topic: "Email + Paid Ads Coordination",
    angle: "Running email flows and paid retargeting independently is leaving money on the table. How suppression lists and trigger-based ads work together",
  },
  {
    topic: "First-Party Data and the Post-Cookie Funnel",
    angle: "Third-party cookie deprecation is done. What D2C brands need to have built by now: quiz funnels, email capture, and server-side event tracking",
  },
  {
    topic: "Contribution Margin vs. ROAS",
    angle: "A 4x ROAS on a 20% margin product is losing money. Why optimising for ROAS without knowing your contribution margin is the most expensive mistake in D2C",
  },
  {
    topic: "Video vs. Static: When Each Wins",
    angle: "Video wins at awareness and emotional connection. Static wins at retargeting and direct response. Most accounts run video everywhere and wonder why CPAs are high",
  },
  {
    topic: "The Warm Audience Window",
    angle: "Website visitors are most convertible within 72 hours of their visit. Most retargeting windows are set to 30 days. The math on why this is wrong",
  },
];

const AI_MARKETING_TOPICS = [
  {
    topic: "AI Creative Testing at Scale",
    angle: "Meta's Advantage+ Creative and Google's Asset Testing are running AI-led multivariate tests you're not seeing in the dashboard. What's actually being optimised",
  },
  {
    topic: "Synthetic Audiences and Predictive Targeting",
    angle: "Platforms are building lookalike models from synthetic data, not just pixel data. What this means for your prospecting campaigns in 2026",
  },
  {
    topic: "AI Copywriting Limitations",
    angle: "Where Claude and GPT-4 produce output that converts and where they reliably fail. An honest audit from someone who uses both daily",
  },
  {
    topic: "Automated Bidding Black Boxes",
    angle: "Advantage+ Shopping and Performance Max are AI-driven. But they optimise for what you tell them to — and most brands set the wrong objective",
  },
  {
    topic: "Claude as a Media Buyer",
    angle: "Using Claude to audit account structure, flag creative fatigue, and identify audience overlap. What it can and cannot replace in the media buying workflow",
  },
  {
    topic: "AI-Generated UGC",
    angle: "Synthetic UGC is now indistinguishable from real creator content in many categories. The ethical and performance implications for D2C brands",
  },
  {
    topic: "Predictive CLV Modelling",
    angle: "AI models that predict customer lifetime value from the first purchase — and how to use that score to adjust your allowable CPA on Meta",
  },
  {
    topic: "Conversational Commerce and AI Chat",
    angle: "AI chat on product pages is lifting conversion 15–30% in beauty and supplements. The implementation stack and what it's actually doing psychologically",
  },
  {
    topic: "AI in Email Personalisation",
    angle: "Behavioural triggers and dynamic content blocks are table stakes. Where AI is actually moving the needle: send-time optimisation and churn prediction",
  },
  {
    topic: "The Prompt Engineering Layer in Ad Ops",
    angle: "The quality of AI-assisted ad copy is entirely a function of prompt quality. What the prompt stack looks like for a high-output D2C creative team",
  },
  {
    topic: "AI Fraud Detection in Paid Media",
    angle: "Invalid traffic and click fraud costs D2C brands an estimated 20% of paid media budgets. Where AI detection tools are now and where they still fail",
  },
  {
    topic: "Multimodal AI and Creative Review",
    angle: "Vision models can now audit your creative for brand consistency, text density, face placement, and emotion signals before you spend a pound on testing",
  },
  {
    topic: "AI-Assisted Competitor Intelligence",
    angle: "Scraping competitor ad libraries, pricing pages, and creative patterns with AI — and turning that into positioning decisions in 48 hours instead of 2 weeks",
  },
];

const QUIP_TOPICS = [
  {
    topic: "attribution_hell",
    hook: "Your Meta says ROAS 4.2. Your Shopify says revenue is flat. Your GA4 says you don't exist.",
    caption: "Pick one and commit. They're all lying equally.\n\n#MetaAds #D2CMarketing #IllumineAds",
  },
  {
    topic: "creative_approval",
    hook: "Three rounds of feedback. Two brand reviews. One legal check.\n\nThe ad that ran: a founder holding the product with natural light.",
    caption: "Your approval process is a creative graveyard.\n\n#ContentCreation #PaidAds #IllumineAds",
  },
  {
    topic: "monday_optimisation",
    hook: "Monday you optimised for purchases.\nTuesday you switched to link clicks.\nWednesday you paused everything.",
    caption: "The algorithm needed time. You needed patience. You gave it 48 hours.\n\n#MetaAds #MediaBuying #IllumineAds",
  },
  {
    topic: "budget_panic",
    hook: "Doubled the budget on Friday afternoon.\nChecked performance Saturday morning.\nPanicked. Halved it.",
    caption: "The learning phase doesn't care about your weekend anxiety.\n\n#MetaAds #D2CMarketing #IllumineAds",
  },
  {
    topic: "ugc_brief",
    hook: "The brief said: authentic, raw, real.\nThe creator delivered: ring light, script, sponsored disclaimer in the first frame.",
    caption: "Authentic content has a very expensive production budget.\n\n#UGC #CreativeStrategy #IllumineAds",
  },
  {
    topic: "lookalike_dreams",
    hook: "Built a 1% lookalike of your best customers.\nBest customers: 11 people.",
    caption: "Garbage in, lookalike garbage out.\n\n#MetaAds #AudienceTargeting #IllumineAds",
  },
  {
    topic: "landing_page_mismatch",
    hook: "The ad promised: glowing skin in 7 days.\nThe landing page: a 4,000-word ingredient breakdown and a pop-up asking for your email.",
    caption: "Your landing page is where your ROAS goes to die.\n\n#ConversionOptimisation #D2CMarketing #IllumineAds",
  },
  {
    topic: "a_b_test_results",
    hook: "Ran an A/B test for 4 days.\nDeclared a winner.\nWinner lost the next month.",
    caption: "Statistical significance requires more than your impatience allows.\n\n#DataDriven #PaidAds #IllumineAds",
  },
  {
    topic: "agency_deck",
    hook: "Slide 1: Impressive case studies.\nSlide 12: Your brand will see similar results.\nSlide 13: Subject to market conditions.",
    caption: "The asterisk is load-bearing.\n\n#MarketingAgency #D2CBrands #IllumineAds",
  },
  {
    topic: "ios_update",
    hook: "Pre-iOS 14: you knew everything.\nPost-iOS 14: you know vibes.\n\nPost-iOS 17: you know your brand colour and that's it.",
    caption: "Modelled conversions are not conversions. They are feelings.\n\n#MetaAds #Attribution #IllumineAds",
  },
  {
    topic: "cpo_vs_roas",
    hook: "Finance team: what's the ROAS?\nYou: 4.8.\nFinance team: why are we losing money?\nYou:",
    caption: "ROAS is a ratio. Margin is a reality. Know both.\n\n#D2CMarketing #ProfitabilityFirst #IllumineAds",
  },
  {
    topic: "viral_reel",
    hook: "The reel with 2 million views: a founder accidentally dropping their product on camera.\nThe reel you spent £800 producing: 340 views.",
    caption: "The algorithm has opinions and they are very inconvenient.\n\n#ContentMarketing #MetaAds #IllumineAds",
  },
  {
    topic: "scaling_fantasy",
    hook: "It works at £50/day.\nYou scale to £500/day.\nIt works at £50/day.",
    caption: "Scaling is not multiplication. It is a completely different problem.\n\n#MetaAds #D2CScaling #IllumineAds",
  },
];

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

function getAuth(scopes) {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes,
  });
}

// ─── TOPIC STATE: READ & WRITE ────────────────────────────────────────────────

async function getTopicState(sheetsClient) {
  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A2:F2",
    });
    const row = res.data.values?.[0];
    if (!row || row.length < 5) {
      // First run — initialise all indexes to 0
      return { neuro: 0, psych: 0, funnel: 0, ai: 0, quip: 0 };
    }
    return {
      neuro: parseInt(row[0]) || 0,
      psych: parseInt(row[1]) || 0,
      funnel: parseInt(row[2]) || 0,
      ai: parseInt(row[3]) || 0,
      quip: parseInt(row[4]) || 0,
    };
  } catch {
    return { neuro: 0, psych: 0, funnel: 0, ai: 0, quip: 0 };
  }
}

async function saveTopicState(sheetsClient, state) {
  // Ensure TOPIC_STATE tab has a header row
  try {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["neuro_index", "psych_index", "funnel_index", "ai_index", "quip_index", "last_updated"]],
      },
    });
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A2:F2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[state.neuro, state.psych, state.funnel, state.ai, state.quip, new Date().toISOString()]],
      },
    });
  } catch (err) {
    console.error("[TOPIC_STATE] Failed to save state:", err.message);
  }
}

// ─── CONTENT CALENDAR ─────────────────────────────────────────────────────────

function getCalendar() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
  return {
    0: { theme: "Platform News", day: "Monday", usesWebSearch: true },
    1: { theme: "Neuromarketing", day: "Tuesday", usesWebSearch: false },
    2: { theme: "Consumer Psychology", day: "Wednesday", usesWebSearch: false },
    3: { theme: "Platform News", day: "Thursday", usesWebSearch: true },
    4: { theme: "Funnel Optimisation", day: "Friday", usesWebSearch: false },
    5: { theme: "AI in Marketing", day: "Saturday", usesWebSearch: false },
    6: { theme: "Quip", day: "Sunday", usesWebSearch: false },
  };
}

// ─── IMAGE RENDERER ───────────────────────────────────────────────────────────

async function renderImage(lines) {
  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "1080px",
          height: "1350px",
          background: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "100px",
          fontFamily: "Inter",
          position: "relative",
        },
        children: [
          // Gold top rule
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "80px",
                left: "100px",
                right: "100px",
                height: "3px",
                background: "#C9A84C",
              },
            },
          },
          // Brand name top-left
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "40px",
                left: "100px",
                fontSize: "22px",
                fontWeight: "900",
                color: "#1A1A1A",
                letterSpacing: "4px",
                textTransform: "uppercase",
              },
              children: "Illumine Ads",
            },
          },
          // Main text lines
          ...lines.map((line, i) => ({
            type: "div",
            props: {
              key: i,
              style: {
                fontSize: "78px",
                fontWeight: "900",
                color: "#1A1A1A",
                lineHeight: "1.1",
                marginBottom: i < lines.length - 1 ? "20px" : "0",
                maxWidth: "880px",
              },
              children: line,
            },
          })),
          // Gold bottom rule
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "80px",
                left: "100px",
                right: "100px",
                height: "3px",
                background: "#C9A84C",
              },
            },
          },
          // Handle bottom-right
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                bottom: "40px",
                right: "100px",
                fontSize: "22px",
                fontWeight: "900",
                color: "#C9A84C",
                letterSpacing: "2px",
              },
              children: "@illumineads",
            },
          },
        ],
      },
    },
    { width: 1080, height: 1350 }
  );

  const arrayBuffer = await imageResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── BLOB UPLOAD ──────────────────────────────────────────────────────────────

async function uploadToBlob(buffer, fileName) {
  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });
  return blob.url;
}

// ─── SHEET HELPERS ────────────────────────────────────────────────────────────

async function ensureSheetTabs(sheetsClient) {
  const spreadsheet = await sheetsClient.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
  });
  const existing = spreadsheet.data.sheets.map((s) => s.properties.title);

  const requiredTabs = {
    CONTENT_LOG: ["Date", "Time", "Theme", "Topic", "Hook", "Caption", "Image_URL", "Status", "Notes"],
    ACTIVITY_LOG: ["Timestamp", "Event", "Theme", "Status", "Detail"],
    TOPIC_STATE: ["neuro_index", "psych_index", "funnel_index", "ai_index", "quip_index", "last_updated"],
  };

  for (const [tab, headers] of Object.entries(requiredTabs)) {
    if (!existing.includes(tab)) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
      });
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${tab}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }
  }
}

async function logToSheet(sheetsClient, theme, topic, hook, caption, imageUrl, status, notes) {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0];
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[date, time, theme, topic, hook, caption, imageUrl, status, notes]] },
  });
}

async function logActivity(sheetsClient, event, theme, status, detail) {
  const timestamp = new Date().toISOString();
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "ACTIVITY_LOG!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[timestamp, event, theme, status, detail]] },
  });
}

// ─── CONTENT GENERATORS ───────────────────────────────────────────────────────

const POST_TOOL = {
  name: "create_post",
  description: "Return the finished social media post.",
  input_schema: {
    type: "object",
    properties: {
      lines: {
        type: "array",
        items: { type: "string" },
        description: "EXACTLY 2 punchy lines for the image card. Each line max 7 words.",
      },
      caption: {
        type: "string",
        description: "Full LinkedIn/Instagram caption including hashtags.",
      },
      hook: {
        type: "string",
        description: "The single strongest line repeated from lines[0].",
      },
    },
    required: ["lines", "caption", "hook"],
  },
};

async function generateTopicPost(anthropic, theme, topicObj) {
  const systemPrompt = `You are the content strategist for Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion (UK and Dubai markets).

VOICE: Sharp, authoritative, second person. Specific mechanisms and numbers where possible. No fluff, no motivational filler, no vague claims.

AUDIENCE: D2C founders, brand owners, and marketing leads running or planning paid media. They are sophisticated and allergic to generic content.

POST FORMAT:
- Image card: 2 lines, max 7 words each. These should be provocative, specific, and make the reader feel something immediately.
- Caption: 150–250 words. Open with a hook (no greeting). State the mechanism. Give 3 specific, actionable insights. Close with a contrarian or unexpected angle. End with 3–4 relevant hashtags.`;

  const userPrompt = `Today's theme: ${theme}
Topic: ${topicObj.topic}
Angle to explore: ${topicObj.angle}

Write a post on this specific topic and angle. Be precise. Use real numbers or research references where appropriate. Do not drift to other topics.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: systemPrompt,
    tools: [POST_TOOL],
    tool_choice: { type: "tool", name: "create_post" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolBlock = response.content.find((b) => b.type === "tool_use" && b.name === "create_post");
  if (!toolBlock) throw new Error("No create_post tool call in response");
  return toolBlock.input;
}

async function generatePlatformNewsPost(anthropic) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

  const systemPrompt = `You are the content strategist for Illumine Ads — a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion (UK and Dubai markets).

VOICE: Sharp, authoritative, second person. Specific. No fluff.

AUDIENCE: D2C founders and marketing leads running paid media.

YOUR JOB TODAY: Search for a real, specific Meta or Google platform development from the last 14 days. Name the exact feature, policy, or update. Frame it as an underestimated shift for D2C paid media. Give 3 specific actions. Close with a contrarian insight.

POST FORMAT:
- Image card: 2 lines, max 7 words each. Reference the real platform change.
- Caption: 150–250 words. Real update named explicitly. 3 actions. Contrarian close. 3–4 hashtags.

DO NOT invent platform updates. If you cannot find a real recent one, search again with different terms.`;

  const userPrompt = `Today's date: ${today}

Search for a real Meta Ads or Google Ads platform update, policy change, or new feature announced in the last 14 days. Use sources like marketingbrew.com, searchengineland.com, socialmediaexaminer.com, or Meta's official Newsroom. Then write the post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: systemPrompt,
    tools: [
      { type: "web_search_20260209", name: "web_search" },
      POST_TOOL,
    ],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  // Handle multi-turn: web search then tool call
  let finalContent = response.content;

  // If the model used web search, continue the conversation to get the post
  if (response.stop_reason === "tool_use") {
    const webSearchBlock = response.content.find((b) => b.type === "tool_use" && b.name === "web_search");
    if (webSearchBlock) {
      // The model ran a web search — feed results back and ask for the post
      const continueResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: systemPrompt,
        tools: [
          { type: "web_search_20260209", name: "web_search" },
          POST_TOOL,
        ],
        tool_choice: { type: "tool", name: "create_post" },
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: response.content },
        ],
      });
      finalContent = continueResponse.content;
    }
  }

  const toolBlock = finalContent.find((b) => b.type === "tool_use" && b.name === "create_post");
  if (!toolBlock) throw new Error("No create_post tool call in platform news response");
  return { post: toolBlock.input, topic: "Platform News" };
}

async function generateQuipPost(anthropic, quipObj) {
  // Quips are pre-written — just return them directly
  return {
    lines: [quipObj.hook.split("\n")[0], quipObj.hook.split("\n")[1] || ""],
    caption: quipObj.caption,
    hook: quipObj.hook.split("\n")[0],
  };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("[AGENT] Starting Illumine Ads agent v4 — 90-day rotation...");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetsClient = google.sheets({ version: "v4", auth });

  try {
    await ensureSheetTabs(sheetsClient);

    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const CALENDAR = getCalendar();
    const config = CALENDAR[day];

    console.log(`[AGENT] Day ${day}: ${config.theme}`);

    // Read current topic state
    const state = await getTopicState(sheetsClient);
    console.log("[AGENT] Current topic state:", JSON.stringify(state));

    let post;
    let topicName;
    let newState = { ...state };

    if (config.usesWebSearch) {
      // Platform News — web search, no topic bank needed
      const result = await generatePlatformNewsPost(anthropic);
      post = result.post;
      topicName = "Platform News (live search)";

    } else if (day === 6) {
      // Sunday quip
      const idx = state.quip % QUIP_TOPICS.length;
      const quipObj = QUIP_TOPICS[idx];
      post = await generateQuipPost(anthropic, quipObj);
      topicName = quipObj.topic;
      newState.quip = idx + 1;
      console.log(`[AGENT] Quip topic [${idx}]: ${topicName}`);

    } else if (day === 1) {
      // Tuesday — Neuromarketing
      const idx = state.neuro % NEUROMARKETING_TOPICS.length;
      const topicObj = NEUROMARKETING_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.neuro = idx + 1;
      console.log(`[AGENT] Neuromarketing topic [${idx}]: ${topicName}`);

    } else if (day === 2) {
      // Wednesday — Consumer Psychology
      const idx = state.psych % CONSUMER_PSYCHOLOGY_TOPICS.length;
      const topicObj = CONSUMER_PSYCHOLOGY_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.psych = idx + 1;
      console.log(`[AGENT] Consumer Psychology topic [${idx}]: ${topicName}`);

    } else if (day === 4) {
      // Friday — Funnel Optimisation
      const idx = state.funnel % FUNNEL_OPTIMISATION_TOPICS.length;
      const topicObj = FUNNEL_OPTIMISATION_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.funnel = idx + 1;
      console.log(`[AGENT] Funnel Optimisation topic [${idx}]: ${topicName}`);

    } else if (day === 5) {
      // Saturday — AI in Marketing
      const idx = state.ai % AI_MARKETING_TOPICS.length;
      const topicObj = AI_MARKETING_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.ai = idx + 1;
      console.log(`[AGENT] AI in Marketing topic [${idx}]: ${topicName}`);
    }

    // Save updated state back to sheet
    await saveTopicState(sheetsClient, newState);
    console.log("[AGENT] Updated topic state:", JSON.stringify(newState));

    // Render and upload image
    const lines = post.lines?.slice(0, 2) || [post.hook || "Illumine Ads", ""];
    const imageBuffer = await renderImage(lines);
    const fileName = `illumine-${day}-${Date.now()}.png`;
    const imageUrl = await uploadToBlob(imageBuffer, fileName);
    console.log("[AGENT] Image uploaded:", imageUrl);

    // Log to Google Sheets
    await logToSheet(
      sheetsClient,
      config.theme,
      topicName,
      post.hook || lines[0],
      post.caption,
      imageUrl,
      "READY",
      "Pending Buffer pickup via Make.com"
    );

    await logActivity(sheetsClient, "POST_GENERATED", config.theme, "SUCCESS", `Topic: ${topicName}`);

    console.log("[AGENT] Done. Post ready for Make.com → Buffer pickup.");

    return res.status(200).json({
      success: true,
      theme: config.theme,
      topic: topicName,
      hook: post.hook,
      image_url: imageUrl,
      state: newState,
    });

  } catch (err) {
    console.error("[AGENT] Fatal error:", err.message);
    try {
      await logActivity(sheetsClient, "ERROR", "unknown", "FAILED", err.message);
    } catch (_) {}
    return res.status(500).json({ error: err.message });
  }
}
