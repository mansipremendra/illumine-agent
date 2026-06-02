/**
 * BUFFER POSTING SERVICE
 * Handles automatic posting to LinkedIn and Instagram via Buffer API
 * 100% hands-off posting at scheduled times
 * UTM tagging built-in — every post gets a unique trackable URL
 */

class BufferPostingService {
  constructor(bufferAccessToken) {
    this.accessToken = bufferAccessToken;
    this.baseUrl = "https://api.bufferapp.com/1";
  }

  // ─────────────────────────────────────────────
  // UTM BUILDER
  // Call this before every post to generate a
  // unique tagged URL for tracking in your dashboard
  // ─────────────────────────────────────────────

  /**
   * Build a UTM-tagged URL for any post
   *
   * @param {object} options
   * @param {string} options.destination  - 'home' | 'vault' | 'apply' | 'veritashire'
   * @param {string} options.platform     - 'linkedin' | 'instagram'
   * @param {string} options.campaign     - Topic slug e.g. 'creative-fatigue' or 'va-placement'
   * @param {string} options.contentType  - 'text' | 'carousel' | 'video' | 'reel' | 'story' | 'document'
   * @returns {string} Full tagged URL
   */
  buildUTM({ destination = "home", platform, campaign, contentType = "text" }) {
    // Base URL map
    const BASE_URLS = {
      home:        "https://illumineads.com/",
      vault:       "https://illumineads.com/vault/",
      apply:       "https://illumineads.com/apply/",
      veritashire: "https://veritashire.com/",
    };

    const base = BASE_URLS[destination] || BASE_URLS.home;

    // Sanitise campaign slug — lowercase, hyphens only
    const slug = campaign
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // ISO week number for utm_term — lets you track week-over-week
    const weekNum = this._getISOWeek(new Date());
    const year    = new Date().getFullYear();

    const params = new URLSearchParams({
      utm_source:   platform,
      utm_medium:   "social",
      utm_campaign: slug,
      utm_content:  contentType,
      utm_term:     `week-${weekNum}-${year}`,
    });

    return `${base}?${params.toString()}`;
  }

  /**
   * Get ISO week number from a Date object
   */
  _getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // ─────────────────────────────────────────────
  // POSTING METHODS
  // ─────────────────────────────────────────────

  /**
   * Post content to LinkedIn via Buffer
   *
   * content should include:
   *   text         - Post copy
   *   utmOptions   - { destination, campaign, contentType } — UTM is built automatically
   *   media        - Optional media object
   *
   * The tagged URL is injected as sharedLink automatically.
   */
  async postToLinkedIn(content, scheduledTime) {
    try {
      console.log("[BUFFER] Posting to LinkedIn...");

      // Build UTM-tagged link
      const taggedURL = this.buildUTM({
        destination:  content.utmOptions?.destination  || "home",
        platform:     "linkedin",
        campaign:     content.utmOptions?.campaign     || "social-post",
        contentType:  content.utmOptions?.contentType  || "text",
      });

      console.log(`[UTM] LinkedIn tagged URL: ${taggedURL}`);

      const postData = {
        text:       content.text,
        sharedLink: content.link || taggedURL, // prefer explicit link, fallback to UTM
        media:      content.media || undefined,
      };

      // Remove undefined fields
      Object.keys(postData).forEach(
        (key) => postData[key] === undefined && delete postData[key]
      );

      const response = await fetch(`${this.baseUrl}/updates/create.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...postData,
          profile_ids:  [process.env.BUFFER_LINKEDIN_PROFILE_ID],
          scheduled_at: Math.floor(new Date(scheduledTime).getTime() / 1000),
          access_token: this.accessToken,
        }),
      });

      if (!response.ok) {
        console.error("[BUFFER ERROR]", response.statusText);
        return null;
      }

      const data = await response.json();
      console.log(`[BUFFER] LinkedIn post scheduled: ${data.id}`);

      return {
        id:          data.id,
        platform:    "linkedin",
        scheduledAt: scheduledTime,
        taggedURL,
        status:      "scheduled",
      };
    } catch (error) {
      console.error("[BUFFER LINKEDIN ERROR]", error);
      return null;
    }
  }

  /**
   * Post content to Instagram via Buffer
   *
   * Instagram doesn't allow clickable links in posts.
   * The tagged URL is returned separately as `bioLink`
   * so you can update your bio/Linktree manually or via API.
   *
   * content should include:
   *   text         - Post copy
   *   utmOptions   - { destination, campaign, contentType }
   *   media        - Optional media object
   */
  async postToInstagram(content, scheduledTime) {
    try {
      console.log("[BUFFER] Posting to Instagram...");

      // Build UTM-tagged bio link
      const taggedURL = this.buildUTM({
        destination:  content.utmOptions?.destination  || "home",
        platform:     "instagram",
        campaign:     content.utmOptions?.campaign     || "social-post",
        contentType:  content.utmOptions?.contentType  || "text",
      });

      console.log(`[UTM] Instagram bio link to update: ${taggedURL}`);

      const postData = {
        text:  content.text,
        media: content.media || undefined,
      };

      // Remove undefined fields
      Object.keys(postData).forEach(
        (key) => postData[key] === undefined && delete postData[key]
      );

      const response = await fetch(`${this.baseUrl}/updates/create.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...postData,
          profile_ids:  [process.env.BUFFER_INSTAGRAM_PROFILE_ID],
          scheduled_at: Math.floor(new Date(scheduledTime).getTime() / 1000),
          access_token: this.accessToken,
        }),
      });

      if (!response.ok) {
        console.error("[BUFFER ERROR]", response.statusText);
        return null;
      }

      const data = await response.json();
      console.log(`[BUFFER] Instagram post scheduled: ${data.id}`);
      console.log(`[UTM] ⚠️  Update Instagram bio link to: ${taggedURL}`);

      return {
        id:          data.id,
        platform:    "instagram",
        scheduledAt: scheduledTime,
        bioLink:     taggedURL, // Update this in your Instagram bio before post goes live
        status:      "scheduled",
      };
    } catch (error) {
      console.error("[BUFFER INSTAGRAM ERROR]", error);
      return null;
    }
  }

  /**
   * Helper: Convert time string to scheduled timestamp
   */
  getScheduledTime(timeString, timezone = "UTC") {
    const now = new Date();
    const [hours, minutes] = timeString.split(":").map(Number);

    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, 0, 0);

    // If scheduled time is in the past today, schedule for tomorrow
    if (scheduled < now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }

  /**
   * Batch post to both platforms with unique UTMs per platform
   *
   * Example usage:
   *
   * await service.postToBothPlatforms({
   *   text: "Your post copy here",
   *   utmOptions: {
   *     destination:  "vault",        // which page to link to
   *     campaign:     "creative-fatigue-diagnostic",  // post topic slug
   *     contentType:  "carousel",     // post format
   *   }
   * }, "09:00", "12:00");
   */
  async postToBothPlatforms(content, linkedinTime, instagramTime) {
    const linkedinScheduled  = this.getScheduledTime(linkedinTime);
    const instagramScheduled = this.getScheduledTime(instagramTime);

    const [linkedinResult, instagramResult] = await Promise.all([
      this.postToLinkedIn(content, linkedinScheduled),
      this.postToInstagram(content, instagramScheduled),
    ]);

    // Log a summary of both tagged URLs for reference
    console.log("\n[UTM SUMMARY]");
    console.log(`LinkedIn  → ${linkedinResult?.taggedURL}`);
    console.log(`Instagram → ${instagramResult?.bioLink} (update bio before post goes live)`);
    console.log("");

    return {
      linkedin:  linkedinResult,
      instagram: instagramResult,
      scheduledAt: {
        linkedin:  linkedinScheduled,
        instagram: instagramScheduled,
      },
      utmSummary: {
        linkedinURL:   linkedinResult?.taggedURL,
        instagramBio:  instagramResult?.bioLink,
      },
    };
  }
}

export default BufferPostingService;
