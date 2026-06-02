/**
 * BUFFER POSTING SERVICE
 * Handles automatic posting to LinkedIn and Instagram via Buffer API
 * 100% hands-off posting at scheduled times
 */

class BufferPostingService {
  constructor(bufferAccessToken) {
    this.accessToken = bufferAccessToken;
    this.baseUrl = "https://api.bufferapp.com/1";
  }

  /**
   * Post content to LinkedIn via Buffer
   */
  async postToLinkedIn(content, scheduledTime) {
    try {
      console.log("[BUFFER] Posting to LinkedIn...");

      const postData = {
        text: content.text,
        sharedLink: content.link || undefined,
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
          profile_ids: [process.env.BUFFER_LINKEDIN_PROFILE_ID],
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
        id: data.id,
        platform: "linkedin",
        scheduledAt: scheduledTime,
        status: "scheduled",
      };
    } catch (error) {
      console.error("[BUFFER LINKEDIN ERROR]", error);
      return null;
    }
  }

  /**
   * Post content to Instagram via Buffer
   */
  async postToInstagram(content, scheduledTime) {
    try {
      console.log("[BUFFER] Posting to Instagram...");

      const postData = {
        text: content.text,
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
          profile_ids: [process.env.BUFFER_INSTAGRAM_PROFILE_ID],
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

      return {
        id: data.id,
        platform: "instagram",
        scheduledAt: scheduledTime,
        status: "scheduled",
      };
    } catch (error) {
      console.error("[BUFFER INSTAGRAM ERROR]", error);
      return null;
    }
  }

  /**
   * Helper: Convert content + time to scheduled timestamp
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
   * Batch post to both platforms
   */
  async postToBothPlatforms(content, linkedinTime, instagramTime) {
    const linkedinScheduled = this.getScheduledTime(linkedinTime);
    const instagramScheduled = this.getScheduledTime(instagramTime);

    const [linkedinResult, instagramResult] = await Promise.all([
      this.postToLinkedIn(content, linkedinScheduled),
      this.postToInstagram(content, instagramScheduled),
    ]);

    return {
      linkedin: linkedinResult,
      instagram: instagramResult,
      scheduledAt: {
        linkedin: linkedinScheduled,
        instagram: instagramScheduled,
      },
    };
  }
}

export default BufferPostingService;
