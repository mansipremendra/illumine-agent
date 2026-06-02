import Anthropic from "@anthropic-ai/sdk";
import { LinkedInClient } from "./clients/linkedin.js";
import { InstagramClient } from "./clients/instagram.js";
import { GoogleSheetsClient } from "./clients/sheets.js";
import { ActivityLogger } from "./utils/logger.js";
import { ContentGenerator } from "./generators/content.js";

const client = new Anthropic();
const logger = new ActivityLogger();

/**
 * ILLUMINE ADS SOCIAL MEDIA AGENT
 * Autonomous agent for LinkedIn + Instagram posting and engagement
 * Runs on schedule (Vercel cron jobs)
 */

class IllumineAgent {
  constructor() {
    this.linkedin = new LinkedInClient(process.env.LINKEDIN_ACCESS_TOKEN);
    this.instagram = new InstagramClient(process.env.INSTAGRAM_ACCESS_TOKEN);
    this.sheets = new GoogleSheetsClient(process.env.GOOGLE_SHEETS_API_KEY);
    this.contentGenerator = new ContentGenerator(client);
    this.logger = logger;
  }

  /**
   * MAIN ORCHESTRATION FUNCTION
   * Runs daily to handle all agent tasks
   */
  async orchestrate() {
    console.log("[ILLUMINE AGENT] Starting orchestration...");
    const timestamp = new Date().toISOString();

    try {
      // 1. Load config from Google Sheets
      const config = await this.sheets.loadConfig();
      const creatorList = await this.sheets.loadCreatorList();

      // 2. Generate today's content (7 posts/week = ~1 per day)
      const todayContent = await this.generateDailyContent(config);

      // 3. Create designs in Canva and schedule via Canva Pro scheduler
      if (todayContent) {
        // Create LinkedIn design
        if (config.platforms.includes("linkedin")) {
          const linkedinDesign = await this.canva.createDesignFromContent(
            todayContent,
            "linkedin",
            config
          );
          if (linkedinDesign) {
            await this.logger.log(
              "DESIGN_CREATED",
              "LINKEDIN",
              linkedinDesign.id,
              `Schedule in Canva Pro at ${config.posting_time_linkedin}`
            );
          }
        }

        // Create Instagram design
        if (config.platforms.includes("instagram")) {
          const instagramDesign = await this.canva.createDesignFromContent(
            todayContent,
            "instagram",
            config
          );
          if (instagramDesign) {
            await this.logger.log(
              "DESIGN_CREATED",
              "INSTAGRAM",
              instagramDesign.id,
              `Schedule in Canva Pro at ${config.posting_time_instagram}`
            );
          }
        }
      }

      // 4. Check for trending topics (if enabled in config)
      if (config.monitor_trending === "TRUE") {
        const trendingContent = await this.captureTrendingTopic(config);
        if (trendingContent) {
          // Create trending designs
          if (config.platforms.includes("linkedin")) {
            const linkedinTrending = await this.canva.createDesignFromContent(
              trendingContent,
              "linkedin",
              config
            );
            if (linkedinTrending) {
              await this.logger.log(
                "TRENDING_DESIGN",
                "LINKEDIN",
                linkedinTrending.id,
                "Trending content design created"
              );
            }
          }
          if (config.platforms.includes("instagram")) {
            const instagramTrending = await this.canva.createDesignFromContent(
              trendingContent,
              "instagram",
              config
            );
            if (instagramTrending) {
              await this.logger.log(
                "TRENDING_DESIGN",
                "INSTAGRAM",
                instagramTrending.id,
                "Trending content design created"
              );
            }
          }
        }
      }

      // 5. Log completion
      console.log(
        `[ILLUMINE AGENT] Orchestration complete at ${timestamp}`
      );
      return { success: true, timestamp };
    } catch (error) {
      console.error("[ILLUMINE AGENT ERROR]", error);
      await this.logger.log(
        "ERROR",
        "ORCHESTRATION",
        null,
        error.message
      );
      throw error;
    }
  }

  /**
   * CONTENT GENERATION
   * Mix of latest trends, consumer psychology, neuromarketing
   * Uses Claude to generate psychology-forward content
   */
  async generateDailyContent(config) {
    try {
      const contentIdeas = [
        "loss_aversion_pricing",
        "cognitive_load_design",
        "mere_exposure_retargeting",
        "decoy_effect_pricing",
        "scarcity_messaging",
        "social_proof_frameworks",
        "anchoring_bias_pricing",
        "recency_bias_analysis",
        "choice_architecture",
        "nudge_theory_ads",
        "default_bias_ctas",
        "sunk_cost_fallacy",
        "endowment_effect",
        "framing_effects",
        "status_quo_bias",
      ];

      // Rotate through content ideas
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
      );
      const contentIdea = contentIdeas[dayOfYear % contentIdeas.length];

      // Generate carousel/reel using Claude
      const content = await this.contentGenerator.generatePsychologyContent(
        contentIdea,
        config
      );

      return content;
    } catch (error) {
      console.error("[CONTENT GENERATION ERROR]", error);
      return null;
    }
  }

  /**
   * TRENDING TOPIC CAPTURE
   * Monitor for viral/trending topics on LinkedIn + Instagram
   * Generate psychology-informed take on the trend
   * Maintain sensitivity + mindfulness guardrails
   */
  async captureTrendingTopic(config) {
    try {
      // Get trending topics from both platforms
      const trendingLinkedIn = await this.linkedin.getTrendingTopics();
      const trendingInstagram = await this.instagram.getTrendingTopics();

      const allTrending = [...trendingLinkedIn, ...trendingInstagram];

      // Filter: Only topics relevant to Illumine's positioning
      const relevantTrends = allTrending.filter((trend) => {
        return (
          // Psychology/marketing/business focused
          trend.category.includes("marketing") ||
          trend.category.includes("psychology") ||
          trend.category.includes("business") ||
          trend.category.includes("advertising") ||
          trend.category.includes("consumer") ||
          // Avoid sensitive topics
          !this.isSensitiveTopic(trend.topic) &&
          // Only pick if trending for less than 24 hours (fresh)
          trend.hoursActive < 24
        );
      });

      if (relevantTrends.length === 0) {
        return null; // No relevant trending topics today
      }

      // Pick the most relevant/engaged trending topic
      const selectedTrend = relevantTrends[0];

      // Generate psychology-informed take
      const content =
        await this.contentGenerator.generateTrendingContent(selectedTrend, config);

      return content;
    } catch (error) {
      console.error("[TRENDING TOPIC CAPTURE ERROR]", error);
      return null;
    }
  }

  /**
   * SENSITIVITY CHECK
   * Avoid posting on sensitive/controversial topics
   * Maintains brand safety + mindfulness
   */
  isSensitiveTopic(topic) {
    const sensitiveKeywords = [
      "politics",
      "election",
      "war",
      "violence",
      "tragedy",
      "death",
      "disease",
      "pandemic",
      "crisis",
      "scandal",
      "controversial",
      "hate",
      "discrimination",
      "illegal",
      "conspiracy",
    ];

    const lowerTopic = topic.toLowerCase();
    return sensitiveKeywords.some((keyword) => lowerTopic.includes(keyword));
  }

  /**
   * MONITORING & REPLY
   * Monitor your own posts for comments and reply intelligently
   */
  async monitorAndReply(config) {
    try {
      // Get recent posts from both platforms
      const linkedinComments = await this.linkedin.getRecentComments();
      const instagramComments = await this.instagram.getRecentComments();

      const allComments = [...linkedinComments, ...instagramComments];

      // For each comment, generate intelligent reply
      for (const comment of allComments) {
        if (comment.replied) continue; // Skip already replied

        const reply = await this.contentGenerator.generateReply(
          comment.text,
          comment.postContent,
          config
        );

        if (reply) {
          if (comment.platform === "linkedin") {
            await this.linkedin.reply(comment.id, reply);
          } else if (comment.platform === "instagram") {
            await this.instagram.reply(comment.id, reply);
          }

          await this.logger.log(
            "REPLY",
            comment.platform.toUpperCase(),
            comment.id,
            reply
          );
        }
      }
    } catch (error) {
      console.error("[MONITORING ERROR]", error);
    }
  }

  /**
   * ENGAGEMENT WITH CREATORS
   * Monitor creator posts and leave thoughtful, value-first comments
   */
  async engageWithCreators(creatorList, config) {
    try {
      for (const creator of creatorList) {
        if (!creator.active) continue;

        // Get recent posts from creator
        const recentPosts =
          creator.platform === "linkedin"
            ? await this.linkedin.getCreatorPosts(creator.handle)
            : await this.instagram.getCreatorPosts(creator.handle);

        // For each post, decide whether to comment (avoid spam)
        for (const post of recentPosts.slice(0, 2)) {
          // Only top 2 recent posts
          if (post.hasCommented) continue; // Skip if already commented

          // Generate value-first comment
          const comment = await this.contentGenerator.generateCreatorComment(
            post.caption,
            creator.niche,
            config
          );

          if (comment) {
            if (creator.platform === "linkedin") {
              await this.linkedin.comment(post.id, comment);
            } else if (creator.platform === "instagram") {
              await this.instagram.comment(post.id, comment);
            }

            await this.logger.log(
              "CREATOR_ENGAGEMENT",
              creator.platform.toUpperCase(),
              post.id,
              comment,
              creator.handle
            );
          }
        }
      }
    } catch (error) {
      console.error("[ENGAGEMENT ERROR]", error);
    }
  }
}

/**
 * ENTRY POINT FOR VERCEL CRON JOBS
 */
export default async function handler(req, res) {
  const agent = new IllumineAgent();

  try {
    const result = await agent.orchestrate();
    res.status(200).json({
      success: true,
      message: "Agent orchestration completed",
      timestamp: result.timestamp,
    });
  } catch (error) {
    console.error("Agent orchestration failed:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
