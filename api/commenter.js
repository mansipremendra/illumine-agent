// api/commenter.js
// Illumine Ads — LinkedIn Commenting Module
// Runs independently of api/agent.js (posting pipeline untouched)
// Schedule: Every 10 minutes, 17:00–23:50 IST (11:30–18:30 UTC), Mon–Fri
// Posts 3 comments per run → ~114 comments over 6.5-hour window

import Anthropic from "@anthropic-ai/sdk";
import { google } from "googleapis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── COMPREHENSIVE CREATOR LIST ───────────────────────────────────────────────
// Combined: 100 from PDF + confirmed active profiles from extended list
// Skipped (no active LinkedIn): Naval Ravikant, Marc Andreessen, Charlie Munger,
// Paul Graham, Jessica Livingston, Jack Dorsey, Evan Williams, Mihaly Csikszentmihalyi,
// Annie Leibovitz, Ben Settle, Intercom, Traction, GrowthLab, Yancey Strickland,
// Leigh Branham, John Boynton, Stacey Mcgill, Mike Filsaime, Toni Ahlgren
const CREATORS = [
  // ── FROM YOUR PDF (100) ──────────────────────────────────────────────────
  { name: "Austin Belcak",          handle: "abelcak" },
  { name: "Adam Danyal",            handle: "adamdanyal" },
  { name: "Adam Grant",             handle: "adammgrant" },
  { name: "Adrienne Tom",           handle: "adriennetom" },
  { name: "Aishwarya Srinivasan",   handle: "aishwarya-srinivasan" },
  { name: "Alex Berman",            handle: "alexanderberman" },
  { name: "Alex Hormozi",           handle: "alexhormozi" },
  { name: "Alic Jasmin",            handle: "alicjasmin" },
  { name: "Allie K. Miller",        handle: "alliekmiller" },
  { name: "Alok Kejriwal",          handle: "alokkejriwal" },
  { name: "Alvin Foo",              handle: "alvinfsc" },
  { name: "Ankur Warikoo",          handle: "warikoo" },
  { name: "Anupam Mittal",          handle: "anupammittal007" },
  { name: "Arianna Huffington",     handle: "ariannahuffington" },
  { name: "Beatrice Vladut",        handle: "beatricevladut" },
  { name: "Benjamin Watkins",       handle: "benjamin-watkins-copywriter" },
  { name: "Bernard Marr",           handle: "bernardmarr" },
  { name: "Charles Miller",         handle: "charlesmiller-pbb" },
  { name: "Chase Dimond",           handle: "chasedimond" },
  { name: "Chris Do",               handle: "thechrisdo" },
  { name: "Chris Donnelly",         handle: "donnellychris" },
  { name: "Codie A. Sanchez",       handle: "codiesanchez" },
  { name: "Colby Kultgen",          handle: "colby-kultgen" },
  { name: "Dan Ariely",             handle: "danariely" },
  { name: "Dan Koe",                handle: "thedankoe" },
  { name: "Daniel Disney",          handle: "danieldisney" },
  { name: "Darren Hardy",           handle: "darrenhardy" },
  { name: "Dean Elkholy",           handle: "deanelkholy" },
  { name: "Dean Seddon",            handle: "therealdealdean" },
  { name: "Dilip Kumar",            handle: "dilipevs" },
  { name: "Dora Vanourek",          handle: "doravanourek" },
  { name: "Dr. Miro Bada",          handle: "drmirobada" },
  { name: "Eric Partaker",          handle: "eric-partaker-5560b92" },
  { name: "Eshleyner",              handle: "eshleyner" },
  { name: "Gary Vaynerchuk",        handle: "garyvaynerchuk" },
  { name: "Gaur Gopal Das",         handle: "gaurgopald" },
  { name: "Gehna Batra",            handle: "gehnabatra" },
  { name: "Greg Isenberg",          handle: "gisenberg" },
  { name: "Greg McKeown",           handle: "gregmckeown" },
  { name: "Gretchen Rubin",         handle: "gretchenrubin" },
  { name: "Hala Taha",              handle: "htaha" },
  { name: "James Clear",            handle: "jamesclear" },
  { name: "Jamie Shanks",           handle: "jamestshanks" },
  { name: "Jason Vana",             handle: "jasonvana" },
  { name: "Jay Shetty",             handle: "shettyjay" },
  { name: "Jennifer Tardy",         handle: "jennifertardy" },
  { name: "Jeremy Boissinot",       handle: "jeremyboissinot" },
  { name: "Jerry Lee",              handle: "jehakjerrylee" },
  { name: "Joe Gannon",             handle: "joe-gannon" },
  { name: "Jessica Hernandez",      handle: "jessicaholbrook" },
  { name: "Jon Youshaei",           handle: "youshaei" },
  { name: "Josh Braun",             handle: "josh-braun" },
  { name: "Justin Welsh",           handle: "justinwelsh" },
  { name: "Justin Wright",          handle: "jwmba" },
  { name: "Lara Acostar",           handle: "laraacostar" },
  { name: "Leila Hormozi",          handle: "leilahormozi" },
  { name: "Lex Fridman",            handle: "lexfridman" },
  { name: "Liz Ryan",               handle: "lizryan" },
  { name: "Luke Redhead",           handle: "lukeredhead" },
  { name: "Luke Shalom",            handle: "lukeshalom" },
  { name: "Mariam Gogidze",         handle: "mariam-gogidze" },
  { name: "Martin Lindstrom",       handle: "lindstromcompany" },
  { name: "Matt Barker",            handle: "mattjbarker1" },
  { name: "Matt Gray",              handle: "mattgray1" },
  { name: "Matt Lakajev",           handle: "mattlakajev" },
  { name: "Mel Robbins",            handle: "melrobbins" },
  { name: "Melonie Dodaro",         handle: "meloniedodaro" },
  { name: "Mischa Collins",         handle: "mischa-collins" },
  { name: "Muskan Arora",           handle: "muskanarorasocial" },
  { name: "Neil Patel",             handle: "neilkpatel" },
  { name: "Nir Eyal",               handle: "nireyal" },
  { name: "Noemi Kis",              handle: "noemikis" },
  { name: "Pratik Thakker",         handle: "pratik-thakker" },
  { name: "Priyankar Mukherjee",    handle: "priyankarmukherjee" },
  { name: "Raj Shamani",            handle: "rajshamani" },
  { name: "Reno Perry",             handle: "renoperry" },
  { name: "Richa Shailesh",         handle: "richa-shailesh" },
  { name: "Richard Branson",        handle: "rbranson" },
  { name: "Robin Sharma",           handle: "robinsharmaofficial" },
  { name: "Ryan Rouse",             handle: "ryanrouse" },
  { name: "Sahil Bloom",            handle: "sahilbloom" },
  { name: "Sakshi Tyagi",           handle: "sakshi-tyagii" },
  { name: "Sejal Singh",            handle: "sejal-singh-81b334226" },
  { name: "Sergiu Bungardean",      handle: "sergiubungardean" },
  { name: "Seth Godin",             handle: "sethgodin" },
  { name: "Siddhi Maheshwari",      handle: "siddhi-maheshwari" },
  { name: "Simon Sinek",            handle: "simonsinek" },
  { name: "Srishti Mishra",         handle: "srishti-mishra-a49b30160" },
  { name: "Stephanie Nuesi",        handle: "stephanienuesi" },
  { name: "Steve Wohlenhaus",       handle: "steve-wohlenhaus" },
  { name: "Steven Bartlett",        handle: "stevenbartlett-123" },
  { name: "Steven Pope",            handle: "steven-pope" },
  { name: "Tim Ferriss",            handle: "timferriss" },
  { name: "Tony Robbins",           handle: "officialtonyrobbins" },
  { name: "Vedika Bhaia",           handle: "vedikabhaia" },
  { name: "Victoria Repa",          handle: "victoria-repa-115a1987" },
  { name: "Vidhya Sharma",          handle: "vidhya-sharma-4676a522a" },
  { name: "Will Cannon",            handle: "will-cannon" },
  { name: "Will McTighe",           handle: "will-mctighe" },

  // ── FROM EXTENDED LIST (confirmed active LinkedIn handles) ───────────────
  { name: "Mark Ritson",            handle: "markritson" },
  { name: "Jon Loomer",             handle: "jonloomer" },
  { name: "Peep Laja",              handle: "peeplaja" },
  { name: "Katelyn Bourgoin",       handle: "katebour" },
  { name: "Mari Smith",             handle: "marismith" },
  { name: "Rand Fishkin",           handle: "randfishkin" },
  { name: "Chris Walker",           handle: "chriswalker171" },
  { name: "Dave Gerhardt",          handle: "davegerhardt" },
  { name: "Ross Simmonds",          handle: "rosssimmonds" },
  { name: "Eddie Shleyner",         handle: "eddieshleyner" },
  { name: "Wes Bush",               handle: "wesbush" },
  { name: "Joanna Wiebe",           handle: "jwiebe" },
  { name: "Anthony Pierri",         handle: "anthonypierri" },
  { name: "Anna Guenther",          handle: "annaguenther" },
  { name: "Daniel Priestley",       handle: "danielpriestley" },
  { name: "Grant Cardone",          handle: "grantcardone" },
  { name: "Russell Brunson",        handle: "russellbrunson" },
  { name: "Sean D'Souza",           handle: "psychotactics" },
  { name: "Neville Medhora",        handle: "nevillemedhora" },
  { name: "Brian Chesky",           handle: "brianchesky" },
  { name: "Nicolas Cole",           handle: "nicolascole" },
  { name: "James Altucher",         handle: "jamesaltucher" },
  { name: "John Maxwell",           handle: "johncmaxwell" },
  { name: "Brene Brown",            handle: "brenebrown" },
  { name: "Amy Cuddy",              handle: "amycuddy" },
  { name: "Daniel Goleman",         handle: "danielgoleman" },
  { name: "Robert Cialdini",        handle: "robert-cialdini" },
  { name: "Carol Dweck",            handle: "carol-dweck" },
  { name: "Angela Duckworth",       handle: "angela-duckworth" },
  { name: "BJ Fogg",                handle: "bjfogg" },
  { name: "Shane Parrish",          handle: "shaneparrish" },
  { name: "Daniel Kahneman",        handle: "daniel-kahneman" },
  { name: "Nassim Taleb",           handle: "nassim-nicholas-taleb" },
  { name: "Holly Tucker",           handle: "hollytuckeruk" },
  { name: "James Watt",             handle: "jameswatt" },
  { name: "April Dunford",          handle: "aprildunford" },
  { name: "Keith Rabois",           handle: "keith-rabois" },
  { name: "Ben Horowitz",           handle: "ben-horowitz" },
  { name: "Aileen Lee",             handle: "aileenlee" },
  { name: "Arlan Hamilton",         handle: "arlan" },
  { name: "Hunter Walk",            handle: "hunterwalk" },
  { name: "Kevin Rose",             handle: "kevinrose" },
  { name: "Drew Houston",           handle: "drewhouston" },
  { name: "Daniel Ek",              handle: "danielek" },
  { name: "Satya Nadella",          handle: "satyanadella" },
  { name: "Sundar Pichai",          handle: "sundarpichai" },
  { name: "Shantanu Narayen",       handle: "shantanunarayen" },
  { name: "Jensen Huang",           handle: "jenhsunhuang" },
  { name: "Sheryl Sandberg",        handle: "sherylsandberg" },
  { name: "Andy Jassy",             handle: "andy-jassy" },
  { name: "Laszlo Bock",            handle: "laszlobock" },
];

// ─── Google Sheets Auth ───────────────────────────────────────────────────────
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// ─── Fetch Recently Commented Handles (avoid repeat within 2 days) ────────────
async function getRecentlyCommented(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "COMMENTS_LOG!A2:C1000",
    });
    const rows = res.data.values || [];
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return new Set(
      rows
        .filter((r) => r[0] && new Date(r[0]).getTime() > twoDaysAgo)
        .map((r) => r[2])
    );
  } catch {
    return new Set();
  }
}

// ─── Pick 3 Creators for This Run ────────────────────────────────────────────
function pickCreators(recentlyCommented) {
  const eligible = CREATORS.filter((c) => !recentlyCommented.has(c.handle));
  const shuffled = eligible.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ─── Fetch Creator's Most Recent LinkedIn Post ────────────────────────────────
async function getCreatorRecentPost(creator) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  try {
    const res = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${creator.handle})&count=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202401",
        },
      }
    );
    if (!res.ok) return { postText: null, postUrn: null };
    const data = await res.json();
    const post = data.elements?.[0];
    if (!post) return { postText: null, postUrn: null };
    const postText =
      post.specificContent?.["com.linkedin.ugc.ShareContent"]
        ?.shareCommentary?.text || null;
    return { postText, postUrn: post.id };
  } catch {
    return { postText: null, postUrn: null };
  }
}

// ─── Generate Comment via Claude ─────────────────────────────────────────────
async function generateComment(creator, postText) {
  const context = postText
    ? `Their recent LinkedIn post says: "${postText.slice(0, 600)}"`
    : `They are a well-known thought leader. Write based on their known area of expertise.`;

  const prompt = `You are Mansi Singh — a sharp, psychology-informed Meta ads strategist for D2C beauty, supplements, and fashion brands in the UK and Dubai. You are not a fan. You are a peer.

You're leaving a LinkedIn comment on ${creator.name}'s post. ${context}

Write ONE comment that:
- Is 2–4 sentences. No more.
- Adds a specific insight, reframe, or nuance they didn't cover — grounded in consumer psychology, paid social, or D2C behaviour
- Sounds like a confident, senior practitioner talking to an equal
- Ends with either a sharp observation that closes the thought, OR one precise question that invites real dialogue
- Never opens with "Great post", "Love this", "So true", "This is gold", "Couldn't agree more", or any variation
- Never name-drops Illumine Ads
- Never uses emojis
- Never flatters. Ever.

Output the comment text only. No quotes. No preamble.`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return res.content[0].text.trim();
}

// ─── Post Comment to LinkedIn ─────────────────────────────────────────────────
async function postLinkedInComment(postUrn, commentText) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const encodedUrn = encodeURIComponent(postUrn);
  const res = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
      },
      body: JSON.stringify({
        actor: `urn:li:person:${process.env.LINKEDIN_PERSON_URN}`,
        message: { text: commentText },
        object: postUrn,
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn API error: ${err}`);
  }
  return await res.json();
}

// ─── Log to COMMENTS_LOG Sheet ────────────────────────────────────────────────
async function logComment(sheets, creator, commentText, postUrn, status, error = "") {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "COMMENTS_LOG!A:G",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        new Date().toISOString(),
        creator.name,
        creator.handle,
        commentText,
        postUrn || "—",
        status,
        error,
      ]],
    },
  });
}

// ─── Ensure COMMENTS_LOG Tab Exists ──────────────────────────────────────────
async function ensureCommentsLogTab(sheets) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const exists = meta.data.sheets.some(
    (s) => s.properties.title === "COMMENTS_LOG"
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "COMMENTS_LOG" } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "COMMENTS_LOG!A1:G1",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Timestamp", "Creator Name", "Handle", "Comment Text", "Post URN", "Status", "Error"]],
      },
    });
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Gate: only run 11:30–18:30 UTC (5 PM – midnight IST)
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const afterStart = utcHour > 11 || (utcHour === 11 && utcMin >= 30);
  const beforeEnd = utcHour < 18 || (utcHour === 18 && utcMin <= 30);
  if (!afterStart || !beforeEnd) {
    return res.status(200).json({ message: "Outside commenting window. Skipping." });
  }

  const sheets = getSheetsClient();
  await ensureCommentsLogTab(sheets);

  const recentlyCommented = await getRecentlyCommented(sheets);
  const selected = pickCreators(recentlyCommented);

  const results = [];

  for (const creator of selected) {
    try {
      const { postText, postUrn } = await getCreatorRecentPost(creator);

      if (!postUrn) {
        await logComment(sheets, creator, "", null, "SKIPPED", "No recent post found via API");
        results.push({ creator: creator.name, status: "skipped" });
        continue;
      }

      const commentText = await generateComment(creator, postText);
      await postLinkedInComment(postUrn, commentText);
      await logComment(sheets, creator, commentText, postUrn, "POSTED");
      results.push({ creator: creator.name, status: "posted", comment: commentText });

      // 5s gap between comments in same run
      await new Promise((r) => setTimeout(r, 5000));
    } catch (err) {
      await logComment(sheets, creator, "", null, "ERROR", err.message);
      results.push({ creator: creator.name, status: "error", error: err.message });
    }
  }

  return res.status(200).json({ run: now.toISOString(), results });
}
