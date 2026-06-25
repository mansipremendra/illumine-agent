// ─── ILLUMINE ADS SOCIAL MEDIA AGENT v6 ──────────────────────────────────────
// Tuesday: 70-topic neuromarketing shuffle. Each principle used once before repeat.
// Wednesday: 70-topic consumer psychology shuffle. Same mechanism.
// Both days: web search finds real brand examples using the principle.
//   If found: how the brand uses it + how D2C brands replicate it.
//   If not found: how D2C brands apply it from scratch.
// Friday: Funnel Optimisation 13-entry rotation (unchanged).
// Saturday: AI in Marketing 13-entry rotation (unchanged).
// Sunday: Quip 13-entry rotation (unchanged).
// Monday/Thursday: Platform News live web search (unchanged).
// TOPIC_STATE tab tracks neuro_used[], psych_used[], funnel_index, ai_index, quip_index.
// No asterisks. No em dashes. Plain text only.
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { ImageResponse } from "@vercel/og";
import { put } from "@vercel/blob";
import { google } from "googleapis";

// ─── NEUROMARKETING: 70 PRINCIPLES ───────────────────────────────────────────

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
  { topic: "The IKEA Effect", angle: "When consumers invest effort into a product. customizing, building, configuring. they value it significantly more than a ready-made alternative." },
  { topic: "The Endowment Effect", angle: "The moment someone feels like they own something, its value spikes in their mind. Free trials exploit this exact mental shift." },
  { topic: "The Framing Effect", angle: "90% fat-free sounds healthy. 10% fat sounds greasy. Same product. Framing is the entire difference in perception." },
  { topic: "Hyperbolic Discounting", angle: "The brain demands immediate rewards over long-term gains. Instant digital delivery beats a superior product shipping in two weeks." },
  { topic: "The Zeigarnik Effect", angle: "Brains hate unfinished loops. Progress bars showing 80% complete push users to finish. Open loops in copy stop the scroll." },
  { topic: "Status Quo Bias", angle: "People default to the path of least resistance. Auto-selecting a premium tier means most users leave it untouched." },
  { topic: "The Pratfall Effect", angle: "Admitting a minor flaw makes a brand seem authentic rather than sterile. Counter-intuitive copy most D2C brands are too scared to use." },
  { topic: "The Rhyme-as-Reason Effect", angle: "Statements that rhyme are judged as more accurate by the subconscious. Taglines that rhyme convert better than those that don't." },
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
  { topic: "Exclusivity Barriers", angle: "Invite-only mechanics play on the fear of being excluded. Perceived entry difficulty increases perceived value of what's inside." },
  { topic: "FOMO as a Conversion Engine", angle: "Real-time notifications of what others are buying create immediate anxiety of missing a prime opportunity. Social activity as social proof." },
  { topic: "The Regret Lottery", angle: "Framing a promotion around avoiding future regret. don't look back wishing you took this. is a more potent conversion driver than gain framing." },
  { topic: "Somatic Markers", angle: "Associating a brand with a strong physical feeling or emotional memory ensures it stays permanently accessible to the subconscious." },
  { topic: "Sensory Language", angle: "Replacing generic descriptions with tactile words. crispy, velvety, sun-drenched. activates the brain's sensory cortex as if experiencing it live." },
  { topic: "Chromatic Psychology", angle: "Red spikes heart rate. Blue builds trust. Color is not aesthetic. it is neurochemical. Most D2C brands pick colors for mood, not mechanism." },
  { topic: "Charm Pricing", angle: "$9.99 versus $10 tricks the left-digit processing system into categorizing the price as significantly lower. One cent does measurable work." },
  { topic: "The Affordability Illusion", angle: "Breaking a fee into daily micro-amounts bypasses the brain's threshold for financial pain. Just $2 a day removes the mental barrier of $730 a year." },
  { topic: "The Rule of 3 Center-Stage Effect", angle: "Three pricing tiers almost always push the buyer to the middle option. The architecture of choice is the strategy." },
  { topic: "The Power of Free", angle: "Free eliminates all perception of downside risk. Even a tiny free component in an offer changes the conversion math completely." },
  { topic: "The Precision Effect", angle: "Precise numbers feel rigorously calculated. $1,432 feels more honest than $1,500. Specificity signals credibility." },
  { topic: "Neurological Storytelling", angle: "A classic narrative arc releases oxytocin and dopamine. Information structured as story is retained far longer than data alone." },
  { topic: "The Socratic Onboarding", angle: "Three consecutive yes-answers prime the brain for continuous agreement. The yes-ladder is a conversion mechanism, not a sales tactic." },
  { topic: "Cognitive Fluency", angle: "Simple words over complex jargon lower processing friction. Easy-to-read copy feels trustworthy. Difficult copy feels risky." },
  { topic: "The Because Shortcut", angle: "Adding any reason to a request. even a weak one. triggers an automated compliance shortcut. The word because does measurable work." },
  { topic: "Curiosity Gaps", angle: "Revealing just enough to hook attention while withholding the resolution triggers an information deficit that demands a click to close." },
  { topic: "The Self-Referencing Effect", angle: "Using you and your forces the reader's brain to project themselves into the scenario. Second person is not style. it is mechanism." },
  { topic: "The Peak-End Rule", angle: "The brain remembers an experience based on its emotional peak and its ending. Average experience is irrelevant. Design for the peak and the last frame." },
  { topic: "The Benjamin Franklin Effect", angle: "Asking for a tiny effortless favor makes the brain rationalize that it must like you. Small asks build the foundation for large commitments." },
  { topic: "The Mere Exposure Effect", angle: "Repeated exposure to a brand builds a sense of familiarity that gradually erodes skepticism. Retargeting is not annoying. it is trust-building by volume." },
  { topic: "The Pique Technique", angle: "An unusual or quirky request grabs attention by disrupting the brain's automated refusal script. Weird works because the brain cannot ignore the unexpected." },
  { topic: "Labeling Priming", angle: "Assigning a positive trait to a user. as one of our most discerning customers. causes the brain to alter behavior to match that identity." },
  { topic: "The Nostalgia Loop", angle: "Referencing positive memories from a consumer's past triggers an immediate wave of safety and comfort that neutralizes buying hesitation." },
  { topic: "Bionic Reading", angle: "Bolding the first letters of key words reduces the energy the brain needs to scan text. Effortless reading feels like trustworthy content." },
  { topic: "Ambient Olfactory Scenting", angle: "Signature scents bypass cognitive processing to trigger comfort and nostalgia instantly. Digital brands replicate this through sensory language in copy." },
  { topic: "Sonic Branding", angle: "A distinct audio cue acts as a mental shortcut that triggers immediate brand familiarity. Most D2C brands have no sonic identity at all." },
  { topic: "Tactile Weight Signaling", angle: "Heavier packaging registers as higher quality in the subconscious. Weight is a proxy for value that bypasses rational evaluation." },
  { topic: "The Melodic Tempo Hack", angle: "Slow background music in retail environments relaxes consumers, extending browsing time and average cart size. Pace controls purchase behavior." },
  { topic: "The Red Price Trigger", angle: "Sale prices in red trigger an automated discount association regardless of actual savings size. Color does the persuasion before the number does." },
  { topic: "The Currency Symbol Eclipse", angle: "Removing the currency sign on premium menus lowers transaction pain and shifts focus from spending to enjoying. The symbol itself creates friction." },
  { topic: "The Contrast Effect", angle: "Placing an expensive product next to a moderately priced one gives the cheaper option an immediate value boost. Context changes perception of price." },
  { topic: "Dynamic Chunking", angle: "Breaking long text into short paragraphs and headers prevents cognitive overload. Formatting is a conversion tool, not a design choice." },
  { topic: "Active Verb Dominance", angle: "Starting sentences with strong motion verbs creates immediate mental visualization of action. Passive copy is invisible copy." },
  { topic: "Emotional Valence Matching", angle: "Aligning the emotional tone of an ad with the user's current emotional state prevents jarring cognitive dissonance. Context targeting is mood targeting." },
  { topic: "Sensory Metaphors", angle: "Phrasing abstract concepts in tactile terms. a rough day, a smooth transition. helps the physical brain grasp ideas it would otherwise skip." },
  { topic: "The Handholding Illusion", angle: "Crystal-clear step-by-step directions remove the anxiety of ambiguity. Buyers do not abandon clear paths. They abandon uncertain ones." },
  { topic: "Choice-Supportive Bias", angle: "Once a customer buys, they aggressively rationalize any flaws to avoid feeling foolish. Post-purchase reassurance locks in loyalty before doubt sets in." },
  { topic: "The Gruen Transfer", angle: "A slightly immersive or unexpected layout disrupts a planned shopping path and turns browsers into impulse buyers. Friction in the right place converts." },
  { topic: "The Bandwagon Effect", angle: "As more people adopt a trend, momentum builds and others join to avoid being left behind. Social velocity is its own conversion mechanism." },
];

// ─── CONSUMER PSYCHOLOGY: 70 PRINCIPLES ──────────────────────────────────────

const CONSUMER_PSYCHOLOGY_TOPICS = [
  { topic: "Weber's Law (Just Noticeable Difference)", angle: "The minimum change a consumer notices is proportional to the original stimulus. Price increases and package size reductions must stay below this threshold to avoid backlash." },
  { topic: "Sensory Adaptation", angle: "Constant stimuli get tuned out. Brands that never refresh their creative or packaging become invisible over time. Novelty is not vanity. it is attention maintenance." },
  { topic: "Subliminal Priming", angle: "Subtle visual cues before a decision point unconsciously shape the next choice. Environmental priming works before the consumer is even aware they are being influenced." },
  { topic: "Selective Attention", angle: "Consumers filter out 99% of daily marketing. Ads only register when they align with an active goal or current problem. Relevance is the only entry point." },
  { topic: "Perceptual Defense", angle: "Consumers block out threatening or uncomfortable messages. Graphic warnings get mentally distorted to protect peace of mind. Comfort before confrontation." },
  { topic: "The Gestalt Principle of Closure", angle: "Brains want to fill in missing pieces. A headline or image left slightly incomplete forces the consumer to engage longer to finish the picture." },
  { topic: "Contextual Priming", angle: "The environment where an ad lives changes how it is perceived. A luxury product in a premium context feels more premium regardless of its actual quality." },
  { topic: "The Recency Effect", angle: "Consumers recall the final piece of information in a sequence far more clearly than the middle. What you say last is what they remember." },
  { topic: "The Primacy Effect", angle: "The first point presented establishes a mental benchmark that colors everything that follows. Lead with your strongest claim, not your warmest greeting." },
  { topic: "Maslow's Hierarchy in Marketing", angle: "Consumers prioritize survival and security before status and self-actualization. Copy must speak to the specific need level the product actually addresses." },
  { topic: "The Ideal Self vs. Actual Self", angle: "Consumers do not buy for who they are. They buy for who they want to become. The product is a bridge to an aspirational identity, not a solution to a current problem." },
  { topic: "Signaling Theory", angle: "People buy luxury or sustainable goods to signal wealth, status, or values to their social group. The audience for the purchase is often bystanders, not the buyer." },
  { topic: "Approach-Avoidance Conflict", angle: "When a product has both a strong positive and a strong negative, marketing must minimize the negative side without drawing attention to the conflict itself." },
  { topic: "Approach-Approach Conflict", angle: "When two options feel equally good, the brand that provides a clear tie-breaking differentiator wins. Comparison clarity is a conversion mechanism." },
  { topic: "Avoidance-Avoidance Conflict", angle: "Choosing between two unappealing options means the brand that positions itself as the lesser of two evils wins. Not ideal but often the most honest positioning available." },
  { topic: "Regulatory Focus: Promotion", angle: "Growth-oriented consumers respond to gains, aspirations, and bold claims. Prevention messaging actively repels them. Audience segmentation must match regulatory focus." },
  { topic: "Regulatory Focus: Prevention", angle: "Security-oriented consumers respond to safety, responsibility, and risk reduction. Aspirational messaging feels irresponsible to them. Know which mode your buyer is in." },
  { topic: "The Self-Reference Effect in Memory", angle: "Consumers remember product information far better when asked to imagine how it fits into their own daily life. Personalization is a memory mechanism, not just a UX feature." },
  { topic: "Cognitive Dissonance Resolution", angle: "Buyers experience regret if they feel they overpaid. Post-purchase reassurance emails and warranties are not customer service. they are retention mechanics." },
  { topic: "In-Group vs. Out-Group Dynamics", angle: "Consumers buy specific brands to feel part of a desirable group or to deliberately distance themselves from one they dislike. Belonging is often the real product." },
  { topic: "The Drive-Reduction Engine", angle: "Physical discomfort creates psychological tension. Products must position themselves as the fastest way to relieve that specific tension, not the best overall solution." },
  { topic: "The Need for Uniqueness", angle: "Some consumers deliberately avoid mass-market trends to maintain an independent identity. Limited editions and customization are not tactics. they are identity products." },
  { topic: "Sunk Cost Fallacy in Loyalty", angle: "A consumer who invests time or money into a reward program keeps buying just to avoid wasting that investment. The entry cost is the retention mechanism." },
  { topic: "The Liking Principle", angle: "Consumers buy from people and brands they genuinely like. Likability is built through shared values, humor, and consistency. not through persuasion alone." },
  { topic: "The Reciprocity Norm", angle: "An unexpected gift or high-quality free resource creates a psychological obligation to reciprocate. The free thing must be genuinely valuable to trigger the effect." },
  { topic: "Deference to Authority", angle: "Expert endorsements and industry credentials lower skepticism and make an offer feel safe. Authority borrowed from a trusted source transfers to the brand." },
  { topic: "The Scarcity Mindset", angle: "Hard-to-get things are valued more. Short supply and limited time create urgency that overrides analytical deliberation." },
  { topic: "The Door-in-the-Face Technique", angle: "Ask for a huge commitment first. which gets rejected. then follow up with a smaller request. The smaller ask feels like a reasonable concession and converts at higher rates." },
  { topic: "The Foot-in-the-Door Technique", angle: "A tiny, effortless first commitment makes the consumer significantly more likely to agree to a larger related ask later. Consistency is the mechanism." },
  { topic: "The Bandwagon Effect in Consumer Behavior", angle: "As more people adopt something, the momentum itself becomes the reason to join. Social velocity is a conversion argument. not just social proof." },
  { topic: "Social Identity Theory", angle: "Consumers look at who buys a brand to decide if it matches their own identity. If people like me buy this is a more powerful motivator than any product feature." },
  { topic: "The Bystander Effect in Commerce", angle: "Broad generic targeting means no one feels personally responsible to act. Narrow, specific targeting forces the individual to respond because the message is clearly for them." },
  { topic: "The Anchoring and Adjustment Heuristic", angle: "The first price seen sets the entire value frame. Displaying the original price before the sale price is not transparency. it is anchoring strategy." },
  { topic: "The Availability Heuristic", angle: "People judge likelihood based on how easily examples come to mind. Vivid product stories and case studies are more persuasive than statistics because they are more retrievable." },
  { topic: "The Representativeness Heuristic", angle: "Consumers judge quality based on how well a product matches their mental image of premium. Heavy packaging, clean fonts, and restrained design all signal quality before the product is even used." },
  { topic: "The Halo Effect in Branding", angle: "A single loved product from a brand makes the consumer assume everything else is equally good. First product experience contaminates all subsequent category judgment." },
  { topic: "The Horns Effect", angle: "A single bad experience. especially with customer service. ruins the consumer's perception of the product itself. One failure point poisons the whole brand evaluation." },
  { topic: "The Affect Heuristic", angle: "Consumers decide on gut feeling and then use logic to justify the choice afterward. Emotional resonance comes first. Product specs come second. Most brands have this backwards." },
  { topic: "The Status Quo Bias in Purchase", angle: "Consumers stick with what they know because switching feels risky and effortful. Acquisition copy must address switching cost, not just product benefit." },
  { topic: "The Compromise Effect", angle: "Given three price tiers, most consumers choose the middle option because it feels like the safest bet. The middle tier is the real target. everything else is architecture." },
  { topic: "The Hyperbolic Discounting Trap", angle: "Consumers choose a small reward now over a much larger reward later. Buy now pay later and instant delivery are built entirely on this cognitive limitation." },
  { topic: "The Unit Bias", angle: "Consumers see a single pre-packaged unit as the optimal amount regardless of its actual size. Portion sizing and serving suggestions directly control perceived adequacy." },
  { topic: "Atmospherics", angle: "Lighting, layout, and music change how long people browse and how much they spend. Digital atmospherics. page speed, visual hierarchy, ambient copy. do the same." },
  { topic: "The Pain of Paying", angle: "Spending cash causes real psychological discomfort. Digital wallets, subscriptions, and credit reduce the pain of payment and systematically increase spend." },
  { topic: "The Left-Digit Effect", angle: "$9.99 feels much closer to $9.00 than $10.00 because the brain reads numbers left to right. One cent changes the entire price category in the consumer's mind." },
  { topic: "Choice Overload in Commerce", angle: "Too many product variants cause anxiety about making the wrong choice, often resulting in no purchase. Fewer options presented more clearly convert better than comprehensive catalogs." },
  { topic: "The Order Effect in Menus", angle: "Items at the top and bottom of a list get the most attention and sell at higher rates. Position is a pricing strategy. placement sells before description does." },
  { topic: "Classical Conditioning in Branding", angle: "Pairing a brand with a positive stimulus repeatedly makes the consumer feel good about the brand on its own. The association does the work once the conditioning is established." },
  { topic: "Operant Conditioning via Rewards", angle: "Points, cashback, and discounts for repeat purchases encourage the behavior to repeat. The reward schedule. not just the reward. determines the strength of the habit." },
  { topic: "The Hook Model", angle: "Trigger, action, variable reward, investment. Apps and products that follow this loop create habits. Variable reward. not consistent reward. is what makes the loop addictive." },
  { topic: "Brand Schema Alteration", angle: "When a trusted brand enters a new category, it borrows credibility but risks breaking the consumer's mental filing system for what the brand means." },
  { topic: "The Zeigarnik Loop in Marketing", angle: "The mind remembers uncompleted tasks better than completed ones. Teaser campaigns that leave a story open keep the brand active in the consumer's head between touchpoints." },
  { topic: "Semantic Network Association", angle: "Brands attach their name to a broad concept. Volvo owns safety. so consumers think of the brand when they think of the concept. Owning the concept owns the category." },
  { topic: "The Cue-Routine-Reward Habit Loop", angle: "Tying a product to an existing daily routine makes it a seamless part of the consumer's lifestyle rather than a deliberate purchase decision." },
  { topic: "The Forgetting Curve Counter", angle: "Consumer memory fades fast. Consistent spaced-out advertising is not repetition for its own sake. it is fighting the exponential decay of brand recall." },
  { topic: "Nostalgia Marketing", angle: "Positive memories from a consumer's past create an immediate sense of safety and comfort that reduces buying hesitation. Nostalgia is a trust shortcut." },
  { topic: "Maslow Realignment for D2C", angle: "D2C brands often pitch self-actualization benefits to consumers still operating at safety or belonging needs. Mismatched hierarchy messaging is why copy feels irrelevant." },
  { topic: "Perceptual Positioning", angle: "The consumer's perception of a brand's position relative to competitors is more influential than the actual product differences. Perception management is product strategy." },
  { topic: "The Mere Exposure Effect in Consumer Behavior", angle: "Familiarity built through consistent brand exposure erodes skepticism over time without any direct persuasion. Presence is its own argument." },
  { topic: "The Endowment Effect in Free Trials", angle: "Once someone has a product in their life even temporarily, returning it feels like a loss. Free trial design should maximize the sense of ownership during the trial period." },
  { topic: "The Need for Cognition", angle: "High-NFC consumers want detailed arguments and evidence. Low-NFC consumers want social proof and simplicity. The same product needs different copy for different cognitive styles." },
  { topic: "Emotional Regulation via Purchase", angle: "Consumers use shopping to manage negative emotions. stress, boredom, anxiety. Brands that appear at the right emotional moment convert at disproportionately high rates." },
  { topic: "Reference Group Influence", angle: "The people a consumer aspires to be like. not just their actual peer group. heavily influence purchase decisions. Aspirational social proof outperforms demographic social proof." },
  { topic: "The Scarcity-Pacing Hack", angle: "Showing stock levels dropping in real time forces a transition from casual browsing to defensive purchasing. Velocity signals value." },
  { topic: "The Assortment Size Illusion", angle: "Large product displays draw consumers in but need a clear filtering system to prevent overwhelm on arrival. Discovery and decision are two different cognitive phases." },
  { topic: "Post-Purchase Rationalization", angle: "Buyers edit their own memory of the purchase to match a positive outcome. Brands that reinforce this narrative in post-purchase communications build loyalty without effort." },
  { topic: "The Pain-Pleasure Principle", angle: "All consumer behavior is ultimately either moving toward pleasure or away from pain. Every piece of copy is in one mode or the other. and most brands switch between them incoherently." },
  { topic: "Social Comparison Theory", angle: "Consumers evaluate their own choices by comparing them to others. Positioning a brand's users as slightly ahead of where the consumer wants to be creates aspirational pull." },
  { topic: "The Reciprocal Concession Effect", angle: "When a brand makes a concession. a discount, a free upgrade, an extended return window. the consumer feels psychologically obligated to reciprocate with a purchase or loyalty." },
  { topic: "The Commitment and Consistency Principle", angle: "Once consumers publicly commit to a value or preference, they buy in ways that are consistent with that commitment. Getting the commitment is more valuable than making the pitch." },
  { topic: "Psychological Ownership Before Purchase", angle: "Copy and UX that makes the consumer mentally place the product in their life before buying. imagine waking up to this, picture yourself wearing this. dramatically increases conversion." },
];

// ─── FUNNEL OPTIMISATION: 13 TOPICS ──────────────────────────────────────────

const FUNNEL_OPTIMISATION_TOPICS = [
  { topic: "Hook Rate vs. Hold Rate", angle: "Hook rate (3-sec views/impressions) tells you if the first frame works. Hold rate tells you if the story holds. Most brands only check one." },
  { topic: "Landing Page Cognitive Load", angle: "Every extra element on a landing page is a decision your buyer has to make. Reducing cognitive load is the fastest conversion lever most brands ignore." },
  { topic: "The Checkout Abandonment Stack", angle: "74% of carts are abandoned. The causes are layered. friction, trust gaps, shipping cost shock. Fixing one without the others moves nothing." },
  { topic: "Frequency Capping and Ad Fatigue", angle: "What frequency is too high? The answer is different for cold, warm, and hot audiences. and most accounts use one blanket cap for all three." },
  { topic: "Offer Architecture", angle: "Most D2C brands have a product. Fewer have an offer. The difference. risk reversal, bundling, urgency, bonus stacking. is the entire gap between 1x and 4x ROAS." },
  { topic: "The Thank You Page as a Revenue Channel", angle: "Post-purchase is the highest-trust moment in the entire funnel. Most brands waste it with a basic confirmation. Here is what to put there instead." },
  { topic: "Audience Segmentation Beyond Demographics", angle: "Age and gender targeting is 2019. Behavioural, intent, and psychographic segmentation is where the arbitrage is in 2026 Meta accounts." },
  { topic: "Creative Velocity", angle: "The brands winning on Meta are testing 10-15 new creatives per week, not perfecting 2. Creative velocity beats creative quality at cold traffic scale." },
  { topic: "Email and Paid Ads Coordination", angle: "Running email flows and paid retargeting independently is leaving money on the table. How suppression lists and trigger-based ads work together." },
  { topic: "First-Party Data and the Post-Cookie Funnel", angle: "Third-party cookie deprecation is done. What D2C brands need to have built by now: quiz funnels, email capture, and server-side event tracking." },
  { topic: "Contribution Margin vs. ROAS", angle: "A 4x ROAS on a 20% margin product is losing money. Why optimising for ROAS without knowing your contribution margin is the most expensive mistake in D2C." },
  { topic: "Video vs. Static: When Each Wins", angle: "Video wins at awareness and emotional connection. Static wins at retargeting and direct response. Most accounts run video everywhere and wonder why CPAs are high." },
  { topic: "The Warm Audience Window", angle: "Website visitors are most convertible within 72 hours of their visit. Most retargeting windows are set to 30 days. The math on why this is wrong." },
];

// ─── AI IN MARKETING: 13 TOPICS ──────────────────────────────────────────────

const AI_MARKETING_TOPICS = [
  { topic: "AI Creative Testing at Scale", angle: "Meta's Advantage+ Creative and Google's Asset Testing are running AI-led multivariate tests you are not seeing in the dashboard. What is actually being optimised." },
  { topic: "Synthetic Audiences and Predictive Targeting", angle: "Platforms are building lookalike models from synthetic data, not just pixel data. What this means for your prospecting campaigns in 2026." },
  { topic: "AI Copywriting Limitations", angle: "Where Claude and GPT-4 produce output that converts and where they reliably fail. An honest audit from someone who uses both daily." },
  { topic: "Automated Bidding Black Boxes", angle: "Advantage+ Shopping and Performance Max are AI-driven. But they optimise for what you tell them to. and most brands set the wrong objective." },
  { topic: "Claude as a Media Buyer", angle: "Using Claude to audit account structure, flag creative fatigue, and identify audience overlap. What it can and cannot replace in the media buying workflow." },
  { topic: "AI-Generated UGC", angle: "Synthetic UGC is now indistinguishable from real creator content in many categories. The ethical and performance implications for D2C brands." },
  { topic: "Predictive CLV Modelling", angle: "AI models that predict customer lifetime value from the first purchase. and how to use that score to adjust your allowable CPA on Meta." },
  { topic: "Conversational Commerce and AI Chat", angle: "AI chat on product pages is lifting conversion 15-30% in beauty and supplements. The implementation stack and what it is actually doing psychologically." },
  { topic: "AI in Email Personalisation", angle: "Behavioural triggers and dynamic content blocks are table stakes. Where AI is actually moving the needle: send-time optimisation and churn prediction." },
  { topic: "The Prompt Engineering Layer in Ad Ops", angle: "The quality of AI-assisted ad copy is entirely a function of prompt quality. What the prompt stack looks like for a high-output D2C creative team." },
  { topic: "AI Fraud Detection in Paid Media", angle: "Invalid traffic and click fraud costs D2C brands an estimated 20% of paid media budgets. Where AI detection tools are now and where they still fail." },
  { topic: "Multimodal AI and Creative Review", angle: "Vision models can now audit your creative for brand consistency, text density, face placement, and emotion signals before you spend a pound on testing." },
  { topic: "AI-Assisted Competitor Intelligence", angle: "Scraping competitor ad libraries, pricing pages, and creative patterns with AI. and turning that into positioning decisions in 48 hours instead of 2 weeks." },
];

// ─── QUIPS: 13 TOPICS ────────────────────────────────────────────────────────

const QUIP_TOPICS = [
  { topic: "attribution_hell", hook: "Your Meta says ROAS 4.2. Your Shopify says revenue is flat. Your GA4 says you don't exist.", caption: "Pick one and commit. They're all lying equally.\n\n#MetaAds #D2CMarketing #IllumineAds" },
  { topic: "creative_approval", hook: "Three rounds of feedback. Two brand reviews. One legal check.\n\nThe ad that ran: a founder holding the product with natural light.", caption: "Your approval process is a creative graveyard.\n\n#ContentCreation #PaidAds #IllumineAds" },
  { topic: "monday_optimisation", hook: "Monday you optimised for purchases.\nTuesday you switched to link clicks.\nWednesday you paused everything.", caption: "The algorithm needed time. You needed patience. You gave it 48 hours.\n\n#MetaAds #MediaBuying #IllumineAds" },
  { topic: "budget_panic", hook: "Doubled the budget on Friday afternoon.\nChecked performance Saturday morning.\nPanicked. Halved it.", caption: "The learning phase doesn't care about your weekend anxiety.\n\n#MetaAds #D2CMarketing #IllumineAds" },
  { topic: "ugc_brief", hook: "The brief said: authentic, raw, real.\nThe creator delivered: ring light, script, sponsored disclaimer in the first frame.", caption: "Authentic content has a very expensive production budget.\n\n#UGC #CreativeStrategy #IllumineAds" },
  { topic: "lookalike_dreams", hook: "Built a 1% lookalike of your best customers.\nBest customers: 11 people.", caption: "Garbage in, lookalike garbage out.\n\n#MetaAds #AudienceTargeting #IllumineAds" },
  { topic: "landing_page_mismatch", hook: "The ad promised: glowing skin in 7 days.\nThe landing page: a 4,000-word ingredient breakdown and a pop-up asking for your email.", caption: "Your landing page is where your ROAS goes to die.\n\n#ConversionOptimisation #D2CMarketing #IllumineAds" },
  { topic: "a_b_test_results", hook: "Ran an A/B test for 4 days.\nDeclared a winner.\nWinner lost the next month.", caption: "Statistical significance requires more than your impatience allows.\n\n#DataDriven #PaidAds #IllumineAds" },
  { topic: "agency_deck", hook: "Slide 1: Impressive case studies.\nSlide 12: Your brand will see similar results.\nSlide 13: Subject to market conditions.", caption: "The asterisk is load-bearing.\n\n#MarketingAgency #D2CBrands #IllumineAds" },
  { topic: "ios_update", hook: "Pre-iOS 14: you knew everything.\nPost-iOS 14: you know vibes.\n\nPost-iOS 17: you know your brand colour and that's it.", caption: "Modelled conversions are not conversions. They are feelings.\n\n#MetaAds #Attribution #IllumineAds" },
  { topic: "cpo_vs_roas", hook: "Finance team: what's the ROAS?\nYou: 4.8.\nFinance team: why are we losing money?\nYou:", caption: "ROAS is a ratio. Margin is a reality. Know both.\n\n#D2CMarketing #ProfitabilityFirst #IllumineAds" },
  { topic: "viral_reel", hook: "The reel with 2 million views: a founder accidentally dropping their product on camera.\nThe reel you spent 800 pounds producing: 340 views.", caption: "The algorithm has opinions and they are very inconvenient.\n\n#ContentMarketing #MetaAds #IllumineAds" },
  { topic: "scaling_fantasy", hook: "It works at 50 pounds a day.\nYou scale to 500 pounds a day.\nIt works at 50 pounds a day.", caption: "Scaling is not multiplication. It is a completely different problem.\n\n#MetaAds #D2CScaling #IllumineAds" },
];

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

function getAuth(scopes) {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes,
  });
}

// ─── SHUFFLE UTILITY ──────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const a = [...arr.keys()];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── TOPIC STATE: READ & WRITE ────────────────────────────────────────────────
// State schema (row 2 of TOPIC_STATE tab):
// A: neuro_used . JSON array of remaining shuffled indexes for neuromarketing
// B: psych_used . JSON array of remaining shuffled indexes for consumer psychology
// C: funnel_index. integer
// D: ai_index   . integer
// E: quip_index . integer
// F: last_updated. ISO timestamp

async function getTopicState(sheetsClient) {
  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A2:F2",
    });
    const row = res.data.values?.[0];
    if (!row || row.length < 5) {
      return {
        neuro_used: shuffleArray(NEUROMARKETING_TOPICS),
        psych_used: shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS),
        funnel: 0, ai: 0, quip: 0,
      };
    }
    return {
      neuro_used: JSON.parse(row[0] || "[]").length > 0 ? JSON.parse(row[0]) : shuffleArray(NEUROMARKETING_TOPICS),
      psych_used: JSON.parse(row[1] || "[]").length > 0 ? JSON.parse(row[1]) : shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS),
      funnel: parseInt(row[2]) || 0,
      ai: parseInt(row[3]) || 0,
      quip: parseInt(row[4]) || 0,
    };
  } catch {
    return {
      neuro_used: shuffleArray(NEUROMARKETING_TOPICS),
      psych_used: shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS),
      funnel: 0, ai: 0, quip: 0,
    };
  }
}

async function saveTopicState(sheetsClient, state) {
  try {
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A1:F1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [["neuro_used", "psych_used", "funnel_index", "ai_index", "quip_index", "last_updated"]] },
    });
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "TOPIC_STATE!A2:F2",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          JSON.stringify(state.neuro_used),
          JSON.stringify(state.psych_used),
          state.funnel,
          state.ai,
          state.quip,
          new Date().toISOString(),
        ]],
      },
    });
  } catch (err) {
    console.error("[TOPIC_STATE] Failed to save:", err.message);
  }
}

// ─── CONTENT CALENDAR ─────────────────────────────────────────────────────────

function getCalendar() {
  return {
    0: { theme: "Platform News", day: "Sunday", usesWebSearch: true },
    1: { theme: "Neuromarketing", day: "Monday", usesWebSearch: false },
    2: { theme: "Consumer Psychology", day: "Tuesday", usesWebSearch: false },
    3: { theme: "Platform News", day: "Wednesday", usesWebSearch: true },
    4: { theme: "Funnel Optimisation", day: "Thursday", usesWebSearch: false },
    5: { theme: "AI in Marketing", day: "Friday", usesWebSearch: false },
    6: { theme: "Quip", day: "Saturday", usesWebSearch: false },
  };
}

// ─── IMAGE RENDERER ───────────────────────────────────────────────────────────

async function renderImage(lines) {
  const imageResponse = new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "1080px", height: "1350px", background: "#FFFFFF",
          display: "flex", flexDirection: "column", justifyContent: "center",
          alignItems: "flex-start", padding: "100px", fontFamily: "Inter", position: "relative",
        },
        children: [
          { type: "div", props: { style: { position: "absolute", top: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", top: "40px", left: "100px", fontSize: "22px", fontWeight: "900", color: "#1A1A1A", letterSpacing: "4px", textTransform: "uppercase" }, children: "Illumine Ads" } },
          ...lines.map((line, i) => ({
            type: "div",
            props: {
              key: i,
              style: { fontSize: "78px", fontWeight: "900", color: "#1A1A1A", lineHeight: "1.1", marginBottom: i < lines.length - 1 ? "20px" : "0", maxWidth: "880px" },
              children: line,
            },
          })),
          { type: "div", props: { style: { position: "absolute", bottom: "80px", left: "100px", right: "100px", height: "3px", background: "#C9A84C" } } },
          { type: "div", props: { style: { position: "absolute", bottom: "40px", right: "100px", fontSize: "22px", fontWeight: "900", color: "#C9A84C", letterSpacing: "2px" }, children: "@illumineads" } },
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
  const blob = await put(fileName, buffer, { access: "public", contentType: "image/png", addRandomSuffix: true });
  return blob.url;
}

// ─── SHEET HELPERS ────────────────────────────────────────────────────────────

async function ensureSheetTabs(sheetsClient) {
  const spreadsheet = await sheetsClient.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const existing = spreadsheet.data.sheets.map((s) => s.properties.title);
  const requiredTabs = {
    CONTENT_LOG: ["Date", "Time", "Theme", "Topic", "Hook", "Caption", "Image_URL", "Status", "Notes"],
    ACTIVITY_LOG: ["Timestamp", "Event", "Theme", "Status", "Detail"],
    TOPIC_STATE: ["neuro_used", "psych_used", "funnel_index", "ai_index", "quip_index", "last_updated"],
  };
  for (const [tab, headers] of Object.entries(requiredTabs)) {
    if (!existing.includes(tab)) {
      await sheetsClient.spreadsheets.batchUpdate({ spreadsheetId: process.env.GOOGLE_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] } });
      await sheetsClient.spreadsheets.values.update({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `${tab}!A1`, valueInputOption: "USER_ENTERED", requestBody: { values: [headers] } });
    }
  }
}

async function logToSheet(sheetsClient, theme, topic, hook, caption, imageUrl, status, notes) {
  const now = new Date();
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "CONTENT_LOG!A:I",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[now.toISOString().split("T")[0], now.toTimeString().split(" ")[0], theme, topic, hook, caption, imageUrl, status, notes]] },
  });
}

async function logActivity(sheetsClient, event, theme, status, detail) {
  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "ACTIVITY_LOG!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[new Date().toISOString(), event, theme, status, detail]] },
  });
}

// ─── POST TOOL DEFINITION ─────────────────────────────────────────────────────

const POST_TOOL = {
  name: "create_post",
  description: "Return the finished social media post.",
  input_schema: {
    type: "object",
    properties: {
      lines: { type: "array", items: { type: "string" }, description: "EXACTLY 2 punchy lines for the image card. Each line max 7 words." },
      caption: { type: "string", description: "Full LinkedIn/Instagram caption including hashtags." },
      hook: { type: "string", description: "The single strongest line from lines[0]." },
    },
    required: ["lines", "caption", "hook"],
  },
};

// ─── GENERATE: NEUROMARKETING + CONSUMER PSYCHOLOGY ──────────────────────────
// Web search finds real brand examples using the principle.
// If found: how the brand uses it + how D2C brands replicate it.
// If not found: how D2C brands apply it from scratch.
// Single bounded call: 1 web search max, then create_post. No open loops.

async function generatePrinciplePost(anthropic, theme, topicObj) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific mechanisms and real numbers where possible. No fluff. No motivational filler. No vague claims.

AUDIENCE: D2C founders, brand owners, and marketing leads running paid media. They are sophisticated and allergic to generic content.

YOUR JOB:
1. Search once for real brand examples using today's principle. Look for well-known consumer brands. Nike, Apple, Amazon, Zara, Glossier, Oatly, Gymshark, Duolingo, or similar. that actively use this principle in their marketing or product experience.
2. If you find a real example: explain exactly how that brand uses the principle, then give 3 specific ways a D2C brand can replicate the same mechanism without the same budget.
3. If you find no clear brand example: explain how a D2C brand can apply this principle from scratch with 3 concrete tactics.
4. Call create_post immediately after searching. Do not search more than once.

POST FORMAT:
- Image card: 2 lines, max 7 words each. Name the principle and make it feel urgent or counterintuitive.
- Caption: 150 to 250 words. Open with the principle named as a hook. One real brand example if found (name the brand explicitly). 3 specific D2C tactics. Contrarian close. 3 to 4 hashtags.

FORMATTING RULES. no exceptions:
- NO asterisks anywhere. Not for bold, not for bullets, not for emphasis.
- NO em dashes anywhere. Use a full stop or a new line instead.
- NO markdown of any kind.
- Plain sentences and line breaks only.

WORKFLOW: Search once, then immediately call create_post. If search returns nothing useful, proceed without an example. Do not search again.`;

  const userPrompt = `Today is ${today}.
Theme: ${theme}
Principle: ${topicObj.topic}
Angle: ${topicObj.angle}

Search for: "brands using ${topicObj.topic} marketing example"

Then write the post using create_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: systemPrompt,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 1 },
      POST_TOOL,
    ],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock && toolBlock.name === "web_search") {
      const continueResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 1 },
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

  const finalToolBlock = finalContent.find((b) => b.type === "tool_use" && b.name === "create_post");
  if (!finalToolBlock) throw new Error("No create_post tool call in response");
  return finalToolBlock.input;
}

// ─── GENERATE: FUNNEL + AI IN MARKETING ──────────────────────────────────────
// Trend-aware single bounded call. One web search max then create_post.

const TREND_SEARCH_QUERIES = {
  "Funnel Optimisation": "Meta ads funnel optimisation D2C trends",
  "AI in Marketing": "AI marketing tools D2C paid media latest",
};

async function generateTopicPost(anthropic, theme, topicObj) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const searchQuery = TREND_SEARCH_QUERIES[theme] || `${theme} marketing trends`;

  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific mechanisms and numbers where possible. No fluff. No motivational filler. No vague claims.

AUDIENCE: D2C founders, brand owners, and marketing leads running paid media. They are sophisticated and allergic to generic content.

POST FORMAT:
- Image card: 2 lines, max 7 words each. Provocative, specific, make the reader feel something immediately.
- Caption: 150 to 250 words. Open with a hook (no greeting). State the mechanism. Give 3 specific, actionable insights. Close with a contrarian or unexpected angle. End with 3 to 4 relevant hashtags.

FORMATTING RULES. no exceptions:
- NO asterisks anywhere. Not for bold, not for bullets, not for emphasis.
- NO em dashes anywhere. Use a full stop or a new line instead.
- NO markdown of any kind.
- Plain sentences and line breaks only.

WORKFLOW: You have ONE web search. Use it at most once to check what is currently being discussed about today's topic, then immediately call create_post. Do not search more than once.`;

  const userPrompt = `Today is ${today}.
Theme: ${theme}
Topic: ${topicObj.topic}
Base angle: ${topicObj.angle}

Optionally search once for: "${searchQuery}" to find a sharper current angle or data point. Then write the post using create_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: systemPrompt,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 1 },
      POST_TOOL,
    ],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (toolBlock && toolBlock.name === "web_search") {
      const continueResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 1 },
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

  const finalToolBlock = finalContent.find((b) => b.type === "tool_use" && b.name === "create_post");
  if (!finalToolBlock) throw new Error("No create_post tool call in response");
  return finalToolBlock.input;
}

// ─── GENERATE: PLATFORM NEWS ──────────────────────────────────────────────────

async function generatePlatformNewsPost(anthropic) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

  const systemPrompt = `You are the content strategist for Illumine Ads, a psychology-informed Meta ads consultancy for D2C founders in beauty, supplements, and fashion in UK and Dubai markets.

VOICE: Sharp, authoritative, second person. Specific. No fluff.

AUDIENCE: D2C founders and marketing leads running paid media.

YOUR JOB: Search for a real, specific Meta or Google platform development from the last 14 days. Name the exact feature, policy, or update. Frame it as an underestimated shift for D2C paid media. Give 3 specific actions. Close with a contrarian insight.

POST FORMAT:
- Image card: 2 lines, max 7 words each. Reference the real platform change.
- Caption: 150 to 250 words. Real update named explicitly. 3 actions. Contrarian close. 3 to 4 hashtags.

FORMATTING RULES. no exceptions:
- NO asterisks anywhere. Not for bold, not for bullets, not for emphasis.
- NO em dashes anywhere. Use a full stop or a new line instead.
- NO markdown of any kind.
- Plain sentences and line breaks only.

DO NOT invent platform updates. Search first. Then write.`;

  const userPrompt = `Today is ${today}. Search for a real Meta Ads or Google Ads platform update from the last 14 days. Then write the post using create_post.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: systemPrompt,
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: 1 },
      POST_TOOL,
    ],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: userPrompt }],
  });

  let finalContent = response.content;
  if (response.stop_reason === "tool_use") {
    const webSearchBlock = response.content.find((b) => b.type === "tool_use" && b.name === "web_search");
    if (webSearchBlock) {
      const continueResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 1 },
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

  const finalToolBlock = finalContent.find((b) => b.type === "tool_use" && b.name === "create_post");
  if (!finalToolBlock) throw new Error("No create_post tool call in platform news response");
  return { post: finalToolBlock.input, topic: "Platform News" };
}

// ─── GENERATE: QUIP ──────────────────────────────────────────────────────────

async function generateQuipPost(quipObj) {
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

  console.log("[AGENT] Starting Illumine Ads agent v6. 70-topic shuffle + brand examples...");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheetsClient = google.sheets({ version: "v4", auth });

  try {
    await ensureSheetTabs(sheetsClient);

    const now = new Date();
    const day = now.getUTCDay();
    const CALENDAR = getCalendar();
    const config = CALENDAR[day];

    console.log(`[AGENT] Day ${day}: ${config.theme}`);

    const state = await getTopicState(sheetsClient);
    console.log(`[AGENT] State. neuro_used: ${state.neuro_used.length} remaining, psych_used: ${state.psych_used.length} remaining`);

    let post;
    let topicName;
    let newState = { ...state };

    if (config.usesWebSearch) {
      const result = await generatePlatformNewsPost(anthropic);
      post = result.post;
      topicName = "Platform News (live search)";

    } else if (day === 6) {
      // Saturday. Quip
      const idx = state.quip % QUIP_TOPICS.length;
      const quipObj = QUIP_TOPICS[idx];
      post = await generateQuipPost(quipObj);
      topicName = quipObj.topic;
      newState.quip = idx + 1;

    } else if (day === 1) {
      // Monday. Neuromarketing (70-topic shuffle)
      if (state.neuro_used.length === 0) {
        newState.neuro_used = shuffleArray(NEUROMARKETING_TOPICS);
        console.log("[AGENT] Neuromarketing pool exhausted. reshuffled all 70 topics.");
      }
      const idx = newState.neuro_used[0];
      const topicObj = NEUROMARKETING_TOPICS[idx];
      post = await generatePrinciplePost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.neuro_used = newState.neuro_used.slice(1);
      console.log(`[AGENT] Neuromarketing [${idx}]: ${topicName}. ${newState.neuro_used.length} remaining`);

    } else if (day === 2) {
      // Tuesday. Consumer Psychology (70-topic shuffle)
      if (state.psych_used.length === 0) {
        newState.psych_used = shuffleArray(CONSUMER_PSYCHOLOGY_TOPICS);
        console.log("[AGENT] Consumer Psychology pool exhausted. reshuffled all 70 topics.");
      }
      const idx = newState.psych_used[0];
      const topicObj = CONSUMER_PSYCHOLOGY_TOPICS[idx];
      post = await generatePrinciplePost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.psych_used = newState.psych_used.slice(1);
      console.log(`[AGENT] Consumer Psychology [${idx}]: ${topicName}. ${newState.psych_used.length} remaining`);

    } else if (day === 4) {
      // Thursday. Funnel Optimisation
      const idx = state.funnel % FUNNEL_OPTIMISATION_TOPICS.length;
      const topicObj = FUNNEL_OPTIMISATION_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.funnel = idx + 1;

    } else if (day === 5) {
      // Friday. AI in Marketing
      const idx = state.ai % AI_MARKETING_TOPICS.length;
      const topicObj = AI_MARKETING_TOPICS[idx];
      post = await generateTopicPost(anthropic, config.theme, topicObj);
      topicName = topicObj.topic;
      newState.ai = idx + 1;
    }

    await saveTopicState(sheetsClient, newState);
    console.log("[AGENT] Topic state saved.");

    const lines = post.lines?.slice(0, 2) || [post.hook || "Illumine Ads", ""];
    const imageBuffer = await renderImage(lines);
    const fileName = `illumine-${day}-${Date.now()}.png`;
    const imageUrl = await uploadToBlob(imageBuffer, fileName);
    console.log("[AGENT] Image uploaded:", imageUrl);

    await logToSheet(sheetsClient, config.theme, topicName, post.hook || lines[0], post.caption, imageUrl, "READY", "Pending Buffer pickup via Make.com");
    await logActivity(sheetsClient, "POST_GENERATED", config.theme, "SUCCESS", `Topic: ${topicName}`);

    console.log("[AGENT] Done.");

    return res.status(200).json({
      success: true,
      theme: config.theme,
      topic: topicName,
      hook: post.hook,
      image_url: imageUrl,
      state: {
        neuro_remaining: newState.neuro_used.length,
        psych_remaining: newState.psych_used.length,
        funnel: newState.funnel,
        ai: newState.ai,
        quip: newState.quip,
      },
    });

  } catch (err) {
    console.error("[AGENT] Fatal error:", err.message);
    try { await logActivity(sheetsClient, "ERROR", "unknown", "FAILED", err.message); } catch (_) {}
    return res.status(500).json({ error: err.message });
  }
}
