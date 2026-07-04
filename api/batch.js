// ─── ILLUMINE ADS WEEKLY CAROUSEL BATCH GENERATOR ────────────────────────────
// Endpoint: /api/batch
// Fully automatic. A single Saturday cron triggers this once. Each invocation
// generates ONE 7-slide carousel post, logs it, then fires a self-chaining
// call to generate the next one, cascading through all 7 posts for the
// following week without any manual intervention.
//
// Every post is now a 7-slide Instagram carousel:
//   Slide 1: Title (the hook/principle, punchy)
//   Slides 2-6: Five points, each with a subheading and a 2-line summary
//   Slide 7: Follow CTA
//
// Content generation produces exactly 5 distinct points per post (up from 3)
// to fill the carousel format properly.
//
// CONTENT_LOG schema (columns A-P):
// Date, Time, Theme, Topic, Hook, Caption, Image_URL_1..Image_URL_7,
// Status, Notes, scheduled_date
//
// TOPIC_STATE schema unchanged: neuro_used, psych_used, funnel_index,
// ai_index, quip_index, last_updated, monday_story
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { ImageResponse } from "@vercel/og";
import { put } from "@vercel/blob";
import { google } from "googleapis";

const NEUROMARKETING_TOPICS = [
  { topic: "Gaze Following", angle: "If a person in your ad looks at the CTA, the viewer's brain follows. Most D2C brands waste this by having models look at the camera." },
  { topic: "The Von Restorff Effect", angle: "An item that breaks the visual pattern gets clicked 2-3x more. One deliberate outlier in your ad set outperforms five polished creatives." },
  { topic: "F-Pattern Scanning", angle: "Digital users scan text in an F shape. Critical hooks placed top-left get seen. Everything else is decoration." },
  { topic: "Z-Pattern Traversal", angle: "On clean landing pages, the brain tracks a Z. Your highest-impact offer belongs in the bottom-right corner." },
  { topic: "Facial Dominance", angle: "Human faces hijack attention faster than any product shot. Use them to hook, then redirect gaze to the offer." },
  { topic: "The Picture Superiority Effect", angle: "Brains retain 65% of information paired with an image versus 10% for text alone. Most D2C brands under-invest in visual-first storytelling." },
  { topic: "Visual De-cluttering", angle: "High visual complexity causes subconscious frustration. Clean layouts with white space lower friction and increase conversion." },
  { topic: "Hero Shot Positioning", angle: "Product left, copy right aligns with how the brain splits visual and language processing. Most brands do it backwards." },
  { topic: "The Direct Arrow Trigger", angle: "Explicit directional cues force the visual cortex to follow. An arrow pointing to a CTA outperforms a floating button every time." },
  { topic: "Loss Aversion", angle: "The pain of losing something is twice as intense as the joy of gaining it. Reframing a benefit as stopping a loss outperforms showcasing a gain." },
  { topic: "The Anchoring Bias", angle: "The first price seen dictates the entire value perception. Showing a high anchor first makes every subsequent price feel like a deal." },
  { topic: "The Decoy Effect", angle: "A deliberately unappealing third option makes your target choice look irresistible. This is pricing architecture, not pricing." },
  { topic: "The Paradox of Choice", angle: "Too many options paralyze decision-making. Limiting choices on a product page accelerates the path to checkout." },
  { topic: "The IKEA Effect", angle: "When consumers invest effort into a product, they value it significantly more than a ready-made alternative." },
  { topic: "The Endowment Effect", angle: "The moment someone feels like they own something, its value spikes in their mind. Free trials exploit this exact mental shift." },
  { topic: "The Framing Effect", angle: "90% fat-free sounds healthy. 10% fat sounds greasy. Same product. Framing is the entire difference in perception." },
  { topic: "Hyperbolic Discounting", angle: "The brain demands immediate rewards over long-term gains. Instant digital delivery beats a superior product shipping in two weeks." },
  { topic: "The Zeigarnik Effect", angle: "Brains hate unfinished loops. Progress bars showing 80% complete push users to finish. Open loops in copy stop the scroll." },
  { topic: "Status Quo Bias", angle: "People default to the path of least resistance. Auto-selecting a premium tier means most users leave it untouched." },
  { topic: "The Pratfall Effect", angle: "Admitting a minor flaw makes a brand seem authentic rather than sterile. Counter-intuitive copy most D2C brands are too scared to use." },
  { topic: "The Rhyme-as-Reason Effect", angle: "Statements that rhyme are judged as more accurate by the subconscious. Taglines that rhyme convert better than those that do not." },
  { topic: "The Base Rate Fallacy", angle: "A single vivid testimonial outperforms a spreadsheet of data. The brain prefers story over statistics every time." },
  { topic: "Social Proof", angle: "When uncertain, the brain copies the crowd. Showing what 50,000 others chose relieves the anxiety of making a bad decision." },
  { topic: "The Authority Principle", angle: "Lab coats, certifications, and press logos lower skepticism instantly. The brain is conditioned to defer to visible expertise." },
  { topic: "The Common Enemy Strategy", angle: "Uniting an audience against a shared frustration creates instant tribal alignment. The enemy is the mechanism, not a competitor." },
  { topic: "In-Group Bias", angle: "Speaking the exclusive language of a subculture makes the brand feel like an insider. Corporate language signals outsider status." },
  { topic: "The Halo Effect", angle: "Love one product from a brand and the brain assumes everything else is equally good. First impressions contaminate all subsequent judgments." },
  { topic: "Social Defaulting", angle: "Labeling a tier as Most Popular relieves the burden of choosing. The brain assumes the crowd has already done the research." },
  { topic: "The Cheerleader Effect", angle: "Products look more appealing displayed as a curated collection than in isolation. Group presentation elevates individual perceived value." },
  { topic: "Social Reciprocity", angle: "Giving away genuinely high-value free content creates a psychological obligation to return the favor. The free thing must actually be good." },
  { topic: "Pure Scarcity", angle: "Only 3 remaining triggers survival instincts. The brain shifts from analytical browsing to defensive buying in seconds." },
  { topic: "Urgency via Time-Boxing", angle: "Countdown timers disrupt slow, logical thinking and force System 1 to decide before time runs out. The clock is the copywriter." },
  { topic: "Exclusivity Barriers", angle: "Invite-only mechanics play on the fear of being excluded. Perceived entry difficulty increases perceived value of what is inside." },
  { topic: "FOMO as a Conversion Engine", angle: "Real-time notifications of what others are buying create immediate anxiety of missing a prime opportunity. Social activity as social proof." },
  { topic: "The Regret Lottery", angle: "Framing a promotion around avoiding future regret is a more potent conversion driver than gain framing." },
  { topic: "Somatic Markers", angle: "Associating a brand with a strong physical feeling or emotional memory ensures it stays permanently accessible to the subconscious." },
  { topic: "Sensory Language", angle: "Replacing generic descriptions with tactile words activates the brain's sensory cortex as if experiencing it live." },
  { topic: "Chromatic Psychology", angle: "Red spikes heart rate. Blue builds trust. Color is neurochemical. Most D2C brands pick colors for mood, not mechanism." },
  { topic: "Charm Pricing", angle: "$9.99 versus $10 tricks the left-digit processing system into categorizing the price as significantly lower. One cent does measurable work." },
  { topic: "The Affordability Illusion", angle: "Breaking a fee into daily micro-amounts bypasses the brain's threshold for financial pain. Just $2 a day removes the mental barrier of $730 a year." },
  { topic: "The Rule of 3 Center-Stage Effect", angle: "Three pricing tiers almost always push the buyer to the middle option. The architecture of choice is the strategy." },
  { topic: "The Power of Free", angle: "Free eliminates all perception of downside risk. Even a tiny free component in an offer changes the conversion math completely." },
  { topic: "The Precision Effect", angle: "Precise numbers feel rigorously calculated. $1,432 feels more honest than $1,500. Specificity signals credibility." },
  { topic: "Neurological Storytelling", angle: "A classic narrative arc releases oxytocin and dopamine. Information structured as story is retained far longer than data alone." },
  { topic: "The Socratic Onboarding", angle: "Three consecutive yes-answers prime the brain for continuous agreement. The yes-ladder is a conversion mechanism, not a sales tactic." },
  { topic: "Cognitive Fluency", angle: "Simple words over complex jargon lower processing friction. Easy-to-read copy feels trustworthy. Difficult copy feels risky." },
  { topic: "The Because Shortcut", angle: "Adding any reason to a request triggers an automated compliance shortcut. The word because does measurable work." },
  { topic: "Curiosity Gaps", angle: "Revealing just enough to hook attention while withholding the resolution triggers an information deficit that demands a click to close." },
  { topic: "The Self-Referencing Effect", angle: "Using you and your forces the reader's brain to project themselves into the scenario. Second person is mechanism, not style." },
  { topic: "The Peak-End Rule", angle: "The brain remembers an experience based on its emotional peak and its ending. Design for the peak and the last frame." },
  { topic: "The Benjamin Franklin Effect", angle: "Asking for a tiny effortless favor makes the brain rationalize that it must like you. Small asks build the foundation for large commitments." },
  { topic: "The Mere Exposure Effect", angle: "Repeated exposure to a brand builds familiarity that gradually erodes skepticism. Retargeting is trust-building by volume." },
  { topic: "The Pique Technique", angle: "An unusual or quirky request grabs attention by disrupting the brain's automated refusal script." },
  { topic: "Labeling Priming", angle: "Assigning a positive trait to a user causes the brain to alter behavior to match that identity." },
  { topic: "The Nostalgia Loop", angle: "Referencing positive memories from a consumer's past triggers an immediate wave of safety and comfort that neutralizes buying hesitation." },
  { topic: "Bionic Reading", angle: "Bolding the first letters of key words reduces the energy the brain needs to scan text." },
  { topic: "Ambient Olfactory Scenting", angle: "Signature scents bypass cognitive processing to trigger comfort and nostalgia instantly." },
  { topic: "Sonic Branding", angle: "A distinct audio cue acts as a mental shortcut that triggers immediate brand familiarity." },
  { topic: "Tactile Weight Signaling", angle: "Heavier packaging registers as higher quality in the subconscious." },
  { topic: "The Melodic Tempo Hack", angle: "Slow background music in retail environments relaxes consumers, extending browsing time and average cart size." },
  { topic: "The Red Price Trigger", angle: "Sale prices in red trigger an automated discount association regardless of actual savings size." },
  { topic: "The Currency Symbol Eclipse", angle: "Removing the currency sign on premium menus lowers transaction pain and shifts focus from spending to enjoying." },
  { topic: "The Contrast Effect", angle: "Placing an expensive product next to a moderately priced one gives the cheaper option an immediate value boost." },
  { topic: "Dynamic Chunking", angle: "Breaking long text into short paragraphs and headers prevents cognitive overload." },
  { topic: "Active Verb Dominance", angle: "Starting sentences with strong motion verbs creates immediate mental visualization of action." },
  { topic: "Emotional Valence Matching", angle: "Aligning the emotional tone of an ad with the user's current emotional state prevents jarring cognitive dissonance." },
  { topic: "Sensory Metaphors", angle: "Phrasing abstract concepts in tactile terms helps the physical brain grasp ideas it would otherwise skip." },
  { topic: "The Handholding Illusion", angle: "Crystal-clear step-by-step directions remove the anxiety of ambiguity." },
  { topic: "Choice-Supportive Bias", angle: "Once a customer buys, they aggressively rationalize any flaws to avoid feeling foolish." },
  { topic: "The Gruen Transfer", angle: "A slightly immersive or unexpected layout disrupts a planned shopping path and turns browsers into impulse buyers." },
  { topic: "The Bandwagon Effect", angle: "As more people adopt a trend, momentum builds and others join to avoid being left behind." },
];

const CONSUMER_PSYCHOLOGY_TOPICS = [
  { topic: "Weber's Law", angle: "The minimum change a consumer notices is proportional to the original stimulus. Price and package changes must stay below this threshold." },
  { topic: "Sensory Adaptation", angle: "Constant stimuli get tuned out. Brands that never refresh their creative become invisible over time." },
  { topic: "Subliminal Priming", angle: "Subtle visual cues before a decision point unconsciously shape the next choice." },
  { topic: "Selective Attention", angle: "Consumers filter out 99% of daily marketing. Ads only register when they align with an active goal." },
  { topic: "Perceptual Defense", angle: "Consumers block out threatening or uncomfortable messages to protect peace of mind." },
  { topic: "The Gestalt Principle of Closure", angle: "Brains want to fill in missing pieces. An incomplete headline forces the consumer to engage longer." },
  { topic: "Contextual Priming", angle: "The environment where an ad lives changes how it is perceived." },
  { topic: "The Recency Effect", angle: "Consumers recall the final piece of information far more clearly than the middle." },
  { topic: "The Primacy Effect", angle: "The first point presented establishes a mental benchmark that colors everything that follows." },
  { topic: "Maslow's Hierarchy in Marketing", angle: "Consumers prioritize survival and security before status and self-actualization." },
  { topic: "The Ideal Self vs. Actual Self", angle: "Consumers buy for who they want to become, not who they are." },
  { topic: "Signaling Theory", angle: "People buy luxury or sustainable goods to signal wealth, status, or values to their social group." },
  { topic: "Approach-Avoidance Conflict", angle: "When a product has both a strong positive and negative, marketing must minimize the negative." },
  { topic: "Approach-Approach Conflict", angle: "When two options feel equally good, a clear tie-breaking differentiator wins the sale." },
  { topic: "Avoidance-Avoidance Conflict", angle: "The brand that positions itself as the lesser of two evils wins." },
  { topic: "Regulatory Focus: Promotion", angle: "Growth-oriented consumers respond to gains, aspirations, and bold claims." },
  { topic: "Regulatory Focus: Prevention", angle: "Security-oriented consumers respond to safety, responsibility, and risk reduction." },
  { topic: "The Self-Reference Effect in Memory", angle: "Consumers remember information far better when asked to imagine it in their own life." },
  { topic: "Cognitive Dissonance Resolution", angle: "Post-purchase reassurance emails and warranties are retention mechanics, not customer service." },
  { topic: "In-Group vs. Out-Group Dynamics", angle: "Consumers buy specific brands to feel part of a desirable group." },
  { topic: "The Drive-Reduction Engine", angle: "Products must position themselves as the fastest way to relieve a specific tension." },
  { topic: "The Need for Uniqueness", angle: "Some consumers avoid mass-market trends to maintain an independent identity." },
  { topic: "Sunk Cost Fallacy in Loyalty", angle: "A consumer who invests in a reward program keeps buying to avoid wasting that investment." },
  { topic: "The Liking Principle", angle: "Consumers buy from brands they genuinely like, built through shared values and consistency." },
  { topic: "The Reciprocity Norm", angle: "An unexpected gift creates a psychological obligation to reciprocate." },
  { topic: "Deference to Authority", angle: "Expert endorsements lower skepticism and make an offer feel safe." },
  { topic: "The Scarcity Mindset", angle: "Hard-to-get things are valued more. Short supply creates urgency that overrides deliberation." },
  { topic: "The Door-in-the-Face Technique", angle: "A huge ask first, followed by a smaller one, feels like a fair concession." },
  { topic: "The Foot-in-the-Door Technique", angle: "A tiny first commitment makes a larger later ask far more likely to succeed." },
  { topic: "The Bandwagon Effect in Consumer Behavior", angle: "Momentum itself becomes the reason to join." },
  { topic: "Social Identity Theory", angle: "People like me buy this is a stronger motivator than any feature." },
  { topic: "The Bystander Effect in Commerce", angle: "Narrow, specific targeting forces individuals to respond because the message is clearly for them." },
  { topic: "The Anchoring and Adjustment Heuristic", angle: "Displaying the original price before the sale price is anchoring strategy, not transparency." },
  { topic: "The Availability Heuristic", angle: "Vivid product stories are more persuasive than statistics because they are more retrievable." },
  { topic: "The Representativeness Heuristic", angle: "Heavy packaging and clean fonts signal quality before the product is even used." },
  { topic: "The Halo Effect in Branding", angle: "One loved product makes the consumer assume everything else is equally good." },
  { topic: "The Horns Effect", angle: "A single bad experience ruins the consumer's perception of the entire product." },
  { topic: "The Affect Heuristic", angle: "Consumers decide on gut feeling first, then use logic to justify the choice." },
  { topic: "The Status Quo Bias in Purchase", angle: "Acquisition copy must address switching cost, not just product benefit." },
  { topic: "The Compromise Effect", angle: "Given three price tiers, most consumers choose the middle option as the safest bet." },
  { topic: "The Hyperbolic Discounting Trap", angle: "Buy now pay later is built entirely on preferring small rewards now over larger ones later." },
  { topic: "The Unit Bias", angle: "Consumers see a single pre-packaged unit as the optimal amount regardless of its size." },
  { topic: "Atmospherics", angle: "Digital atmospherics like page speed and visual hierarchy change how long people browse." },
  { topic: "The Pain of Paying", angle: "Digital wallets and subscriptions reduce the pain of payment and increase spend." },
  { topic: "The Left-Digit Effect", angle: "$9.99 feels much closer to $9 than $10 because the brain reads left to right." },
  { topic: "Choice Overload in Commerce", angle: "Fewer options presented clearly convert better than comprehensive catalogs." },
  { topic: "The Order Effect in Menus", angle: "Items at the top and bottom of a list sell at higher rates." },
  { topic: "Classical Conditioning in Branding", angle: "Pairing a brand with a positive stimulus repeatedly makes the consumer feel good about it." },
  { topic: "Operant Conditioning via Rewards", angle: "The reward schedule, not just the reward, determines habit strength." },
  { topic: "The Hook Model", angle: "Variable reward, not consistent reward, is what makes a habit loop addictive." },
  { topic: "Brand Schema Alteration", angle: "A trusted brand entering a new category borrows credibility but risks breaking consumer expectations." },
  { topic: "The Zeigarnik Loop in Marketing", angle: "Teaser campaigns that leave a story open keep the brand active in the consumer's head." },
  { topic: "Semantic Network Association", angle: "Owning a concept in the consumer's mind owns the category." },
  { topic: "The Cue-Routine-Reward Habit Loop", angle: "Tying a product to an existing daily routine makes it a seamless part of lifestyle." },
  { topic: "The Forgetting Curve Counter", angle: "Consistent spaced-out advertising fights the exponential decay of brand recall." },
  { topic: "Nostalgia Marketing", angle: "Positive past memories create an immediate sense of safety that reduces buying hesitation." },
  { topic: "Maslow Realignment for D2C", angle: "Mismatched hierarchy messaging is why copy feels irrelevant to the buyer." },
  { topic: "Perceptual Positioning", angle: "Perception of a brand's position matters more than actual product differences." },
  { topic: "The Mere Exposure Effect in Consumer Behavior", angle: "Familiarity built through consistent exposure erodes skepticism without direct persuasion." },
  { topic: "The Endowment Effect in Free Trials", angle: "Returning a product after even temporary ownership feels like a loss." },
  { topic: "The Need for Cognition", angle: "High-NFC consumers want detailed evidence. Low-NFC consumers want social proof and simplicity." },
  { topic: "Emotional Regulation via Purchase", angle: "Brands that appear at the right emotional moment convert at disproportionately high rates." },
  { topic: "Reference Group Influence", angle: "Aspirational social proof outperforms demographic social proof." },
  { topic: "The Scarcity-Pacing Hack", angle: "Showing stock levels dropping in real time forces defensive purchasing." },
  { topic: "The Assortment Size Illusion", angle: "Large displays draw consumers in but need clear filtering to prevent overwhelm." },
  { topic: "Post-Purchase Rationalization", angle: "Buyers edit their own memory of a purchase to match a positive outcome." },
  { topic: "The Pain-Pleasure Principle", angle: "Every piece of copy is either moving toward pleasure or away from pain." },
  { topic: "Social Comparison Theory", angle: "Positioning users as slightly ahead of the consumer creates aspirational pull." },
  { topic: "The Reciprocal Concession Effect", angle: "A brand concession creates psychological obligation to reciprocate." },
  { topic: "The Commitment and Consistency Principle", angle: "Getting a public commitment is more valuable than making the pitch." },
  { topic: "Psychological Ownership Before Purchase", angle: "Making the consumer imagine owning a product before buying dramatically increases conversion." },
];

const FUNNEL_OPTIMISATION_TOPICS = [
  { topic: "Hook Rate vs. Hold Rate", angle: "Hook rate tells you if the first frame works. Hold rate tells you if the story holds." },
  { topic: "Landing Page Cognitive Load", angle: "Every extra element is a decision your buyer has to make." },
  { topic: "The Checkout Abandonment Stack", angle: "74% of carts are abandoned from layered causes: friction, trust gaps, shipping cost shock." },
  { topic: "Frequency Capping and Ad Fatigue", angle: "The right frequency cap differs for cold, warm, and hot audiences." },
  { topic: "Offer Architecture", angle: "Risk reversal, bundling, urgency, and bonus stacking are the gap between 1x and 4x ROAS." },
  { topic: "The Thank You Page as a Revenue Channel", angle: "Post-purchase is the highest-trust moment in the funnel and most brands waste it." },
  { topic: "Audience Segmentation Beyond Demographics", angle: "Behavioural and psychographic segmentation is where the arbitrage is in 2026." },
  { topic: "Creative Velocity", angle: "Testing 10-15 new creatives weekly beats perfecting 2 at cold traffic scale." },
  { topic: "Email and Paid Ads Coordination", angle: "Suppression lists and trigger-based ads working together close the gap independent channels leave open." },
  { topic: "First-Party Data and the Post-Cookie Funnel", angle: "Quiz funnels, email capture, and server-side tracking are now essential." },
  { topic: "Contribution Margin vs. ROAS", angle: "A 4x ROAS on 20% margin is losing money if you never check contribution margin." },
  { topic: "Video vs. Static: When Each Wins", angle: "Video wins awareness. Static wins retargeting and direct response." },
  { topic: "The Warm Audience Window", angle: "Website visitors are most convertible within 72 hours, not the standard 30-day window." },
];

const AI_MARKETING_TOPICS = [
  { topic: "AI Creative Testing at Scale", angle: "Meta and Google are running AI-led multivariate tests you never see in the dashboard." },
  { topic: "Synthetic Audiences and Predictive Targeting", angle: "Platforms now build lookalikes from synthetic data, not just pixel data." },
  { topic: "AI Copywriting Limitations", angle: "Where Claude and GPT-4 convert and where they reliably fail, from daily use." },
  { topic: "Automated Bidding Black Boxes", angle: "Advantage+ and Performance Max optimise for what you tell them, and most brands set the wrong objective." },
  { topic: "Claude as a Media Buyer", angle: "What AI can and cannot replace in the media buying workflow." },
  { topic: "AI-Generated UGC", angle: "Synthetic UGC is now indistinguishable from real creator content in many categories." },
  { topic: "Predictive CLV Modelling", angle: "Predicting lifetime value from the first purchase lets you adjust allowable CPA." },
  { topic: "Conversational Commerce and AI Chat", angle: "AI chat on product pages lifts conversion 15-30% in beauty and supplements." },
  { topic: "AI in Email Personalisation", angle: "Send-time optimisation and churn prediction are where AI is actually moving the needle." },
  { topic: "The Prompt Engineering Layer in Ad Ops", angle: "Ad copy quality is entirely a function of prompt quality." },
  { topic: "AI Fraud Detection in Paid Media", angle: "Invalid traffic costs D2C brands an estimated 20% of paid media budgets." },
  { topic: "Multimodal AI and Creative Review", angle: "Vision models can audit brand consistency before you spend on testing." },
  { topic: "AI-Assisted Competitor Intelligence", angle: "Scraping competitor ad libraries turns into positioning decisions in 48 hours instead of 2 weeks." },
];

const QUIP_SEEDS = [
  { topic: "attribution_hell", premise: "Meta, Shopify, and GA4 all report different revenue numbers for the same day, and nobody trusts any of them." },
  { topic: "creative_approval", premise: "Three rounds of feedback and two brand reviews later, the ad that actually runs is the simplest one nobody argued about." },
  { topic: "monday_optimisation", premise: "Switching campaign objectives every single day because Monday's numbers looked bad is the fastest way to reset the algorithm's learning phase." },
  { topic: "budget_panic", premise: "Doubling the budget Friday and halving it Saturday morning because of one bad day is the most common self-sabotage in paid media." },
  { topic: "ugc_brief", premise: "Briefs asking for authentic and raw content almost always come back overproduced, because authenticity has become its own aesthetic to fake." },
  { topic: "lookalike_dreams", premise: "Building a lookalike audience from a customer list of 11 people produces a lookalike of nothing useful." },
  { topic: "landing_page_mismatch", premise: "Ads promising instant results that land on pages with a 4,000 word ingredient breakdown lose the buyer at the exact moment of highest intent." },
  { topic: "a_b_test_results", premise: "Declaring a winner after 4 days of testing before reaching statistical significance is how brands optimise for noise, not signal." },
  { topic: "agency_deck", premise: "Every agency deck has one slide with an asterisk next to the results, and that asterisk is doing more work than the whole pitch." },
  { topic: "ios_update", premise: "Post iOS 14 tracking changes turned precise attribution into modelled guesses that everyone still treats as exact numbers." },
  { topic: "cpo_vs_roas", premise: "A high ROAS on a low margin product can still lose money, and most founders find this out the hard way from their finance team." },
  { topic: "viral_reel", premise: "The reel that gets millions of views is usually an accident, while the expensively produced one gets a few hundred." },
  { topic: "scaling_fantasy", premise: "Doubling ad spend rarely doubles results, because scaling breaks the exact efficiency that made the smaller budget work." },
];

// ─── QUIP CONTENT: expanded from static seeds into full 5-point carousels ────
// (QUIP_SEEDS above provide the premise; Claude expands each into title+5+cta)

// ─── CALENDAR (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat) ──────────────

const CALENDAR = {
  0: { theme: "Quip" },
  1: { theme: "Platform News Monday" },
  2: { theme: "Neuromarketing" },
  3: { theme: "Consumer Psychology" },
  4: { theme: "Platform News Thursday" },
  5: { theme: "Funnel Optimisation" },
  6: { theme: "AI in Marketing" },
};

// ─── OFFICIAL PLATFORM SOURCES ────────────────────────────────────────────────

const PLATFORM_SOURCES = `PRIMARY SOURCES (search in order):
1. business.facebook.com/news
2. developers.facebook.com/blog
3. ads.google.com resources and Google Ads Help Center
4. support.google.com/google-ads
5. about.fb.com/news

SECONDARY (verification only):
6. searchengineland.com
7. marketingbrew.com

EXCLUDED: LinkedIn posts, agency blogs, YouTube, opinion pieces, recap posts.`;

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

function getAuth(scopes) {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes,
  });
}

// ─── SHUFFLE ──────────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr.keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── CAROUSEL SLIDE RENDERER ──────────────────────────────────────────────────
// Three slide types: title, point, cta. Consistent brand system throughout:
// charcoal #1A1A1A, gold #C9A84C, white background, Inter font, gold rules.

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

// Renders and uploads all 7 slides for a carousel post. Returns array of 7 URLs.
async function renderAndUploadCarousel(carousel, dateStr) {
  const urls = [];

  const titleBuffer = await renderTitleSlide(carousel.title);
  urls.push(await uploadToBlob(titleBuffer, `illumine-${dateStr}-1-${Date.now()}.png`));

  for (let i = 0; i < 5; i++) {
    const point = carousel.points[i];
    const buffer = await renderPointSlide(i, point.subheading, point.summary);
    urls.push(await uploadToBlob(buffer, `illumine-${dateStr}-${i + 2}-${Date.now()}.png`));
  }

  const ctaBuffer = await renderCTASlide(carousel.cta);
  urls.push(await uploadToBlob(ctaBuffer, `illumine-${dateStr}-7-${Date.now()}.png`));

  return urls;
}

// ─── CAROUSEL POST TOOL ───────────────────────────────────────────────────────

const CAROUSEL_TOOL = {
  name: "create_carousel_post",
  description: "Return the finished 7-slide carousel post.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Slide 1 headline. Punchy, max 10 words. This is the hook that stops the scroll." },
      points: {
        type: "array",
        description: "EXACTLY 5 points, each becomes one carousel slide.",
        items: {
          type: "object",
          properties: {
            subheading: { type: "string", description: "Max 6 words. Bold, specific." },
            summary: { type: "string", description: "18 to 24 words. Fits naturally on 2 lines. Explains the point concretely." },
          },
          required: ["subheading", "summary"],
        },
        minItems: 5,
        maxItems: 5,
      },
      cta: { type: "string", description: "Slide 7 text. Max 12 words. A follow or engagement call to action." },
      caption: { type: "string", description: "Full caption for the post, 150 to 250 words, including hashtags." },
      hook: { type: "string", description: "Short reference hook, same as title, used for logging." },
    },
    required: ["title", "points", "cta", "caption", "hook"],
  },
};

// ─── TOPIC STATE ──────────────────────────────────────────────────────────────

async function getTopicState(sheetsClient) {
  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A2:G2",
    });
    const row = res.data.values?.[0];
    if (!row || row.length < 5) {
      return { neuro_used: shuffleArray(NEUROMARKETING_TOPICS), psych_used: shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS), funnel: 0, ai: 0, quip: 0, monday_story: "" };
    }
    let neuro_used, psych_used;
    try { neuro_used = JSON.parse(row[0]); if (!Array.isArray(neuro_used) || neuro_used.length === 0) neuro_used = shuffleArray(NEUROMARKETING_TOPICS); } catch { neuro_used = shuffleArray(NEUROMARKETING_TOPICS); }
    try { psych_used = JSON.parse(row[1]); if (!Array.isArray(psych_used) || psych_used.length === 0) psych_used = shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS); } catch { psych_used = shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS); }
    return { neuro_used, psych_used, funnel: parseInt(row[2]) || 0, ai: parseInt(row[3]) || 0, quip: parseInt(row[4]) || 0, monday_story: row[6] || "" };
  } catch {
    return { neuro_used: shuffleArray(NEUROMARKETING_TOPICS), psych_used: shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS), funnel: 0, ai: 0, quip: 0, monday_story: "" };
  }
}

async function saveTopicState(sheetsClient, state) {
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "TOPIC_STATE!A1:G1",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [["neuro_used", "psych_used", "funnel_index", "ai_index", "quip_index", "last_updated", "monday_story"]] },
  });
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "TOPIC_STATE!A2:G2",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[JSON.stringify(state.neuro_used), JSON.stringify(state.psych_used), state.funnel, state.ai, state.quip, new Date().toISOString(), state.monday_story || ""]] },
  });
}

// ─── GET NEXT WEEK DATES (Mon-Sun), computed relative to the Saturday run ────

function getNextWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() + daysUntilMonday + i);
    dates.push({ dateStr: d.toISOString().split("T")[0], dayOfWeek: d.getUTCDay() });
  }
  return dates;
}

async function getExistingDates(sheetsClient) {
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

async function ensureContentLogHeaders(sheetsClient) {
  const headers = ["Date", "Time", "Theme", "Topic", "Hook", "Caption", "Image_URL_1", "Image_URL_2", "Image_URL_3", "Image_URL_4", "Image_URL_5", "Image_URL_6", "Image_URL_7", "Status", "Notes", "scheduled_date"];
  try {
    const res = await sheetsClient.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: "CONTENT_LOG!A1:P1" });
    const existing = res.data.values?.[0];
    if (!existing || existing.length < headers.length || existing[6] !== "Image_URL_1") {
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: "CONTENT_LOG!A1:P1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [headers] },
      });
    }
  } catch (err) {
    console.error("[SHEET] Could not verify/update headers:", err.message);
  }
}

async function logToSheet(sheetsClient, scheduledDate, theme, topic, hook, caption, imageUrls) {
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:P",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        scheduledDate, "21:00:00", theme, topic, hook, caption,
        imageUrls[0], imageUrls[1], imageUrls[2], imageUrls[3], imageUrls[4], imageUrls[5], imageUrls[6],
        "READY", "Weekly carousel batch", scheduledDate,
      ]],
    },
  });
}

// ─── CONTENT GENERATORS (all produce 5-point carousel structure) ─────────────

async function generatePrincipleCarousel(anthropic, theme, topicObj) {
  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific mechanisms and real numbers. No fluff. No motivational filler.

AUDIENCE: D2C founders and marketing leads running paid media. Sophisticated. Allergic to generic content.

YOUR JOB:
1. Search once for a real brand example using today's principle. Look for Nike, Apple, Amazon, Zara, Glossier, Oatly, Gymshark, Duolingo, or similar.
2. Structure the carousel as EXACTLY 5 points:
   Point 1: name the principle and state the mechanism in plain terms
   Point 2: the real brand example if found, explained concretely. If none found, a second mechanism detail instead
   Point 3, 4, 5: three specific, distinct tactics a D2C brand can use this week
3. Call create_carousel_post immediately after searching. Do not search more than once.

CAROUSEL FORMAT:
Title: the principle name, framed as a hook, max 10 words
5 points: each with a subheading (max 6 words) and a summary (18 to 24 words, fits 2 lines)
CTA: a follow or engagement prompt, max 12 words
Caption: 150 to 250 words summarising the full carousel, 3 to 4 hashtags

FORMATTING RULES:
NO asterisks anywhere. NO em dashes anywhere, use a full stop or new line instead. NO markdown. Plain sentences only.`;

  const userPrompt = `Theme: ${theme}
Principle: ${topicObj.topic}
Angle: ${topicObj.angle}

Search for: "brands using ${topicObj.topic} marketing example"
Then write the full carousel using create_carousel_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const wb = response.content.find((b) => b.type === "tool_use" && b.name === "web_search");
    if (wb) {
      const cont = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
        tool_choice: { type: "tool", name: "create_carousel_post" },
        messages: [{ role: "user", content: userPrompt }, { role: "assistant", content: response.content }],
      });
      finalContent = cont.content;
    }
  }
  const tb = finalContent.find((b) => b.type === "tool_use" && b.name === "create_carousel_post");
  if (!tb) throw new Error("No create_carousel_post call");
  return tb.input;
}

async function generateTopicCarousel(anthropic, theme, topicObj) {
  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific mechanisms and numbers. No fluff.

YOUR JOB: Structure the carousel as EXACTLY 5 points that break down the topic:
Point 1: state the core problem or mechanism
Points 2 to 5: four specific, distinct, actionable insights building on each other

CAROUSEL FORMAT:
Title: the topic framed as a hook, max 10 words
5 points: each with a subheading (max 6 words) and summary (18 to 24 words)
CTA: follow or engagement prompt, max 12 words
Caption: 150 to 250 words, 3 to 4 hashtags

FORMATTING RULES:
NO asterisks anywhere. NO em dashes anywhere, use a full stop or new line instead. NO markdown. Plain sentences only.`;

  const userPrompt = `Theme: ${theme}
Topic: ${topicObj.topic}
Angle: ${topicObj.angle}

Write the full carousel using create_carousel_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
    tools: [CAROUSEL_TOOL], tool_choice: { type: "tool", name: "create_carousel_post" },
    messages: [{ role: "user", content: userPrompt }],
  });
  const tb = response.content.find((b) => b.type === "tool_use" && b.name === "create_carousel_post");
  if (!tb) throw new Error("No create_carousel_post call");
  return tb.input;
}

async function generateQuipCarousel(anthropic, quipSeed) {
  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, funny, relatable. This is the one lighter post of the week. Still specific to paid media, not generic humor.

YOUR JOB: Take the premise below and expand it into a 5-point carousel of sharp, funny, true observations about this exact situation in paid media. Each point should land as a standalone relatable truth, building toward the punchline by point 5.

CAROUSEL FORMAT:
Title: a funny, punchy setup line, max 10 words
5 points: each with a short subheading (max 6 words) and a summary (18 to 24 words) that is genuinely funny and true, not just a fact
CTA: a lighthearted follow prompt, max 12 words
Caption: 100 to 200 words, conversational, 3 to 4 hashtags

FORMATTING RULES:
NO asterisks anywhere. NO em dashes anywhere, use a full stop or new line instead. NO markdown. Plain sentences only.`;

  const userPrompt = `Premise: ${quipSeed.premise}

Expand this into the full 5-point comedic carousel using create_carousel_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
    tools: [CAROUSEL_TOOL], tool_choice: { type: "tool", name: "create_carousel_post" },
    messages: [{ role: "user", content: userPrompt }],
  });
  const tb = response.content.find((b) => b.type === "tool_use" && b.name === "create_carousel_post");
  if (!tb) throw new Error("No create_carousel_post call");
  return tb.input;
}

async function generateMondayNewsCarousel(anthropic) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific. No fluff.

YOUR JOB: Search official Meta and Google platform sources for the single most significant update from the last 7 days affecting D2C paid media. Policy and fee changes take priority over feature announcements.

${PLATFORM_SOURCES}

Structure the carousel as EXACTLY 5 points:
Point 1: name the update explicitly and what it is
Point 2: why it matters for D2C brands specifically
Points 3, 4, 5: three specific actions to take this week in response

CAROUSEL FORMAT:
Title: the update framed as a hook, max 10 words
5 points: subheading (max 6 words) and summary (18 to 24 words) each
CTA: follow prompt, max 12 words
Caption: 150 to 250 words, 3 to 4 hashtags

FORMATTING RULES:
NO asterisks anywhere. NO em dashes anywhere. NO markdown. Plain sentences only.

DO NOT invent updates. If nothing in 7 days, extend to 14 days.`;

  const userPrompt = `Today is ${today}. Search official sources for the biggest paid media update from the last 7 days. Then write the full carousel using create_carousel_post.

In the hook field, write: "STORY: [platform] - [one sentence describing what happened]" so Thursday's post can avoid repeating this story.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const wb = response.content.find((b) => b.type === "tool_use" && b.name === "web_search");
    if (wb) {
      const cont = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
        tool_choice: { type: "tool", name: "create_carousel_post" },
        messages: [{ role: "user", content: userPrompt }, { role: "assistant", content: response.content }],
      });
      finalContent = cont.content;
    }
  }
  const tb = finalContent.find((b) => b.type === "tool_use" && b.name === "create_carousel_post");
  if (!tb) throw new Error("No create_carousel_post call for Monday news");

  const storyId = tb.input.hook?.startsWith("STORY:") ? tb.input.hook : `STORY: Platform update week of ${today}`;
  return { carousel: { ...tb.input, hook: tb.input.title }, storyId };
}

async function generateThursdayNewsCarousel(anthropic, mondayStory) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const mondayContext = mondayStory?.startsWith("STORY:")
    ? `Monday's post this week already covered: ${mondayStory.replace("STORY:", "").trim()}`
    : "No Monday story recorded for this week.";

  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific. No fluff.

${mondayContext}

YOUR JOB: Search official Meta and Google platform sources for a DIFFERENT significant update from this week. If nothing meaningfully different is found, do a deep dive on Monday's story from a new angle, a specific ad format, a specific D2C vertical, or an implication Monday did not cover. Do not restate Monday's angle.

${PLATFORM_SOURCES}

Structure the carousel as EXACTLY 5 points covering the new story or deep dive angle, same as Monday's structure.

CAROUSEL FORMAT:
Title: max 10 words
5 points: subheading (max 6 words) and summary (18 to 24 words) each
CTA: max 12 words
Caption: 150 to 250 words, 3 to 4 hashtags

FORMATTING RULES:
NO asterisks anywhere. NO em dashes anywhere. NO markdown. Plain sentences only.`;

  const userPrompt = `Today is ${today}. ${mondayContext}. Search for a different update or write a deep dive from a new angle. Then write the full carousel using create_carousel_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const wb = response.content.find((b) => b.type === "tool_use" && b.name === "web_search");
    if (wb) {
      const cont = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 1800, system: systemPrompt,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }, CAROUSEL_TOOL],
        tool_choice: { type: "tool", name: "create_carousel_post" },
        messages: [{ role: "user", content: userPrompt }, { role: "assistant", content: response.content }],
      });
      finalContent = cont.content;
    }
  }
  const tb = finalContent.find((b) => b.type === "tool_use" && b.name === "create_carousel_post");
  if (!tb) throw new Error("No create_carousel_post call for Thursday news");
  return tb.input;
}

// ─── SELF-CHAINING: fires the next generation call without waiting for it ────
// Ensures the whole week cascades automatically from a single cron trigger.

async function triggerNextGeneration(req) {
  try {
    const host = req.headers.host || process.env.VERCEL_URL;
    const protocol = host?.includes("localhost") ? "http" : "https";
    const selfUrl = `${protocol}://${host}/api/batch`;
    const chainPromise = fetch(selfUrl).catch((err) => console.error("[CHAIN] Self-trigger failed:", err.message));
    // Wait briefly to ensure the request is dispatched before this invocation ends.
    await Promise.race([chainPromise, new Promise((resolve) => setTimeout(resolve, 2000))]);
    console.log("[CHAIN] Next generation triggered.");
  } catch (err) {
    console.error("[CHAIN] Could not trigger next generation:", err.message);
  }
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetsClient = google.sheets({ version: "v4", auth });

  try {
    await ensureContentLogHeaders(sheetsClient);

    const weekDates = getNextWeekDates();
    const existingDates = await getExistingDates(sheetsClient);
    const nextDate = weekDates.find((d) => !existingDates.has(d.dateStr));

    if (!nextDate) {
      return res.status(200).json({
        success: true,
        complete: true,
        message: `All 7 carousels for next week (${weekDates[0].dateStr} to ${weekDates[6].dateStr}) are already generated.`,
        progress: { generated: 7, remaining: 0, total: 7 },
        week: { from: weekDates[0].dateStr, to: weekDates[6].dateStr },
      });
    }

    const { dateStr, dayOfWeek } = nextDate;
    const theme = CALENDAR[dayOfWeek].theme;
    const remaining = weekDates.filter((d) => !existingDates.has(d.dateStr)).length;
    const generated = 7 - remaining;

    console.log(`[BATCH] Generating carousel for ${dateStr} (${theme}). ${generated + 1}/7`);

    const state = await getTopicState(sheetsClient);
    const newState = { ...state };

    let carousel;
    let topicName;

    if (theme === "Platform News Monday") {
      const result = await generateMondayNewsCarousel(anthropic);
      carousel = result.carousel;
      topicName = "Platform News";
      newState.monday_story = result.storyId;

    } else if (theme === "Platform News Thursday") {
      carousel = await generateThursdayNewsCarousel(anthropic, state.monday_story);
      topicName = "Platform News (deep dive)";

    } else if (theme === "Neuromarketing") {
      if (newState.neuro_used.length === 0) newState.neuro_used = shuffleArray(NEUROMARKETING_TOPICS);
      const idx = newState.neuro_used[0];
      const topicObj = NEUROMARKETING_TOPICS[idx];
      carousel = await generatePrincipleCarousel(anthropic, theme, topicObj);
      topicName = topicObj.topic;
      newState.neuro_used = newState.neuro_used.slice(1);

    } else if (theme === "Consumer Psychology") {
      if (newState.psych_used.length === 0) newState.psych_used = shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS);
      const idx = newState.psych_used[0];
      const topicObj = CONSUMER_PSYCHOLOGY_TOPICS[idx];
      carousel = await generatePrincipleCarousel(anthropic, theme, topicObj);
      topicName = topicObj.topic;
      newState.psych_used = newState.psych_used.slice(1);

    } else if (theme === "Funnel Optimisation") {
      const idx = state.funnel % FUNNEL_OPTIMISATION_TOPICS.length;
      const topicObj = FUNNEL_OPTIMISATION_TOPICS[idx];
      carousel = await generateTopicCarousel(anthropic, theme, topicObj);
      topicName = topicObj.topic;
      newState.funnel = idx + 1;

    } else if (theme === "AI in Marketing") {
      const idx = state.ai % AI_MARKETING_TOPICS.length;
      const topicObj = AI_MARKETING_TOPICS[idx];
      carousel = await generateTopicCarousel(anthropic, theme, topicObj);
      topicName = topicObj.topic;
      newState.ai = idx + 1;

    } else if (theme === "Quip") {
      const idx = state.quip % QUIP_SEEDS.length;
      const quipSeed = QUIP_SEEDS[idx];
      carousel = await generateQuipCarousel(anthropic, quipSeed);
      topicName = quipSeed.topic;
      newState.quip = idx + 1;
    }

    await saveTopicState(sheetsClient, newState);

    const imageUrls = await renderAndUploadCarousel(carousel, dateStr);
    await logToSheet(sheetsClient, dateStr, theme, topicName, carousel.hook || carousel.title, carousel.caption, imageUrls);

    const postsRemaining = remaining - 1;
    console.log(`[BATCH] Done. ${generated + 1}/7. ${postsRemaining} remaining.`);

    // Self-chain: if more posts remain this week, trigger the next one automatically.
    if (postsRemaining > 0) {
      await triggerNextGeneration(req);
    }

    return res.status(200).json({
      success: true,
      complete: postsRemaining === 0,
      date: dateStr,
      theme,
      topic: topicName,
      title: carousel.title,
      image_urls: imageUrls,
      progress: { generated: generated + 1, remaining: postsRemaining, total: 7 },
      week: { from: weekDates[0].dateStr, to: weekDates[6].dateStr },
      message: postsRemaining === 0
        ? `All 7 carousels for ${weekDates[0].dateStr} to ${weekDates[6].dateStr} generated automatically.`
        : `${generated + 1} of 7 done. Next post triggered automatically.`,
    });

  } catch (err) {
    console.error("[BATCH] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
