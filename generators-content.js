import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

/**
 * SYSTEM PROMPT FOR ILLUMINE ADS CONTENT
 * Trained on brand voice, positioning, and strategy
 */
const ILLUMINE_SYSTEM_PROMPT = `You are the content creator for Illumine Ads, a psychology-informed Meta ads consulting business for D2C founders.

YOUR VOICE:
- Intellectual: Explain the 'why' behind recommendations, backed by research
- Direct: No fluff, no hype. Tell the truth, even when uncomfortable
- Evidence-based: Every claim should be grounded in peer-reviewed research, behavioral economics, or neuromarketing
- Sophisticated: Respect your audience's intelligence. No oversimplification
- Precision-focused: Details matter—from psychology principles to ad copy word choice

CONTENT FOCUS:
Mix of:
1. Consumer psychology & behavioral economics principles (with research citations)
2. Neuromarketing insights and how they apply to paid advertising
3. Latest developments in social media advertising (Meta, TikTok, LinkedIn)
4. D2C-specific frameworks (targeting, creative, pricing psychology)
5. Real (anonymized) case study examples with quantified outcomes

STRUCTURE FOR CAROUSEL POSTS (LinkedIn/Instagram):
- Slide 1: Hook (question or bold statement related to psychology)
- Slides 2-4: Problem explanation with research/neurological mechanism
- Slides 5-7: Real examples showing the mistake and the psychology
- Slides 8-10: How to fix it with psychology-informed approach + performance data
- Slide 11: Action items (3-4 bullets on what to audit/test)
- Slide 12: Soft CTA if needed (avoid hard sell)

STRUCTURE FOR REELS (15-30 seconds):
- Hook (0-2 sec): Bold statement or question
- Body (2-15 sec): Side-by-side comparison + psychology explanation
- CTA (15-30 sec): Light reference to Illumine (optional, not pushy)

STRUCTURE FOR REPLIES:
- Add genuine value (research insight, additional framework, real example)
- No sales pitch
- Show you understand their point + expand on it
- One focused insight per reply

STRUCTURE FOR CREATOR COMMENTS:
- Value-first (no brand mention unless extremely relevant)
- Reference their insight + add a relevant psychology framework or recent data
- One substantive observation maximum
- Demonstrates thought leadership without self-promotion

KEY DETAILS:
- Target audience: D2C founders (skincare, supplements, fashion) in US/UK
- Categories: Beauty, wellness, luxury goods
- Focus on Meta ads (Facebook, Instagram) primarily
- Always connect psychology principles to paid marketing outcomes
- Use concrete data/metrics whenever possible
- Cite research when claiming psychology principles (e.g., "Tversky & Kahneman's loss aversion research shows...")

TONE ADJUSTMENTS:
- Educational content: Conversational yet authoritative (peer teaching peer)
- Sales/CTA: Confident but honest, no false promises
- Comments: Warm and collaborative, show you understand their perspective
- Replies: Generous with insights, assume good intent

DO NOT:
- Use hype or superlatives
- Make claims without evidence
- Oversimplify complex psychology concepts
- Self-promote without delivering value first
- Generic advice ("Always test!" / "Track your metrics!") without context`;

export class ContentGenerator {
  constructor(anthropicClient) {
    this.client = anthropicClient;
  }

  /**
   * Generate a full carousel or reel about a psychology concept
   */
  async generatePsychologyContent(topic, config) {
    const topicDescriptions = {
      loss_aversion_pricing:
        "How loss aversion psychology makes 'Save £50' convert better than 'Get £50 off'",
      cognitive_load_design:
        "Why minimal ads convert 3x better: cognitive load theory from neuroscience",
      mere_exposure_retargeting:
        "Why your audience needs 5-7 ad touches before converting: mere exposure effect",
      decoy_effect_pricing:
        "How offering 3 pricing tiers increases AOV using the decoy effect (Dan Ariely research)",
      scarcity_messaging:
        "Scarcity psychology: why 'Only 12 left' converts 2x better than 'Shop now'",
      social_proof_frameworks:
        "Which type of social proof works best for different audiences: numbers vs testimonials vs influencer",
      anchoring_bias_pricing:
        "How anchoring bias affects price perception and willingness to pay",
      recency_bias_analysis:
        "Why founders make wrong decisions by overweighting recent data (recency bias)",
      choice_architecture:
        "How to structure product choices and CTAs to guide decisions: choice architecture",
      nudge_theory_ads:
        "Small nudges in ad copy that trigger larger behavioral shifts: nudge theory",
      default_bias_ctas:
        "Why 'Subscribe now' CTAs exploit default bias for higher opt-in rates",
      sunk_cost_fallacy:
        "How to avoid letting sunk costs bias your ad budget decisions",
      endowment_effect:
        "Why audiences value what they feel they own: endowment effect in product marketing",
      framing_effects:
        "How the same offer frames completely differently: framing effects in ad copy",
      status_quo_bias:
        "Why changing ad copy is hard: status quo bias and how to overcome it",
    };

    const prompt = `
Create an educational carousel post (12 slides) for LinkedIn/Instagram about: ${topicDescriptions[topic]}

The post should be highly valuable, psychology-focused, and suitable for D2C founders interested in paid marketing.

Format as a JSON object with an array of 12 slides. Each slide should have:
- "slide_number": number
- "title": Short headline (max 10 words)
- "content": 1-2 sentences of body text. Use line breaks for readability. Can include bullet points formatted as "• Point"
- "emphasis": Any key stat, quote, or data point to highlight

Example:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "The Pricing Psychology Mistake Costing You 40%",
      "content": "Your headline is costing you conversions.\\n\\n'Get £50 off' sounds good.\\n'Save £50' converts better.\\n\\nSame price. Different psychology.",
      "emphasis": "40% conversion lift possible with one word change"
    },
    ...
  ]
}

Make it specific, data-driven, and actionable. Include research references where relevant.`;

    try {
      const message = await this.client.messages.create({
        model: "claude-opus-4-20250805",
        max_tokens: 2000,
        system: ILLUMINE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        try {
          const parsed = JSON.parse(content.text);
          return {
            type: "carousel",
            topic: topic,
            slides: parsed.slides,
            generatedAt: new Date().toISOString(),
          };
        } catch (e) {
          console.error("Failed to parse carousel JSON:", e);
          return null;
        }
      }
    } catch (error) {
      console.error("[CONTENT GENERATION ERROR]", error);
      return null;
    }
  }

  /**
   * Generate intelligent reply to comments on your posts
   */
  async generateReply(commentText, postContent, config) {
    const prompt = `
Someone left this comment on one of Illumine Ads' posts:
"${commentText}"

The post was about: "${postContent}"

Generate a BRIEF (1-2 sentences) value-adding reply. 

Requirements:
- Add a genuine insight or additional psychology framework relevant to their comment
- No sales pitch or CTAs
- Show you understand their point
- One focused observation maximum
- Conversational, warm tone
- If their comment is off-topic or low-effort, respond gracefully without engaging the off-topic direction

Reply text only, no preamble:`;

    try {
      const message = await this.client.messages.create({
        model: "claude-opus-4-20250805",
        max_tokens: 300,
        system: ILLUMINE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        return content.text.trim();
      }
    } catch (error) {
      console.error("[REPLY GENERATION ERROR]", error);
      return null;
    }
  }

  /**
   * Generate value-first comment on creator's post
   */
  async generateCreatorComment(creatorPostCaption, creatorNiche, config) {
    const prompt = `
You're engaging with a content creator in the "${creatorNiche}" space. Their recent post:

"${creatorPostCaption}"

Write a BRIEF (1-2 sentences) comment that:
- References their specific insight
- Adds a relevant psychology/neuromarketing/paid ads angle they might not have mentioned
- Shows thought leadership without self-promotion
- Is genuine and collaborative, not generic
- Demonstrates you understand their niche deeply

Comment text only, no preamble:`;

    try {
      const message = await this.client.messages.create({
        model: "claude-opus-4-20250805",
        max_tokens: 300,
        system: ILLUMINE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        return content.text.trim();
      }
    } catch (error) {
      console.error("[CREATOR COMMENT GENERATION ERROR]", error);
      return null;
    }
  }

  /**
   * Generate psychology-informed take on a trending topic
   * Sensitive + mindful approach
   */
  async generateTrendingContent(trendingTopic, config) {
    const prompt = `
A trending topic is gaining traction on social media:
Topic: "${trendingTopic.topic}"
Category: ${trendingTopic.category}

Generate a BRIEF post that:

1. Acknowledges the trending topic thoughtfully
2. Applies a psychology/neuromarketing/behavioral economics lens to it
3. Provides unique insight that adds value (not just commenting on the trend)
4. Maintains sensitivity and mindfulness (respectful tone, no inflammatory language)
5. Ties back to D2C/marketing/business context where relevant
6. Is educational, not preachy or exploitative

The post should be suitable for both LinkedIn and Instagram (shorter version).

Format as JSON:
{
  "linkedin_version": "Longer version with more detail (2-3 paragraphs)",
  "instagram_version": "Shorter, more visual-friendly version (1-2 sentences)",
  "tone": "Respectful, insightful, non-exploitative"
}

Key requirements:
- Be sensitive to the topic (don't exploit)
- Don't amplify divisiveness or conflict
- Add genuine psychological insight
- Avoid controversial statements
- Focus on understanding human behavior
`;

    try {
      const message = await this.client.messages.create({
        model: "claude-opus-4-20250805",
        max_tokens: 1500,
        system: ILLUMINE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === "text") {
        try {
          const parsed = JSON.parse(content.text);
          return {
            type: "trending",
            topic: trendingTopic.topic,
            linkedinVersion: parsed.linkedin_version,
            instagramVersion: parsed.instagram_version,
            tone: parsed.tone,
            generatedAt: new Date().toISOString(),
            flagged: false,
          };
        } catch (e) {
          console.error("Failed to parse trending content JSON:", e);
          return null;
        }
      }
    } catch (error) {
      console.error("[TRENDING CONTENT GENERATION ERROR]", error);
      return null;
    }
  }
}
