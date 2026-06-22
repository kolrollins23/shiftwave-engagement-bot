import twilio from "twilio";
import Anthropic from "@anthropic-ai/sdk";
import { readContacts } from "./_store.js";
import { readEngagement, saveEngagement } from "./_engagement.js";

// ── Auth ──────────────────────────────────────────────────────────────────────
function isAuthorized(req) {
  const pwd = req.headers["x-app-password"];
  return pwd === process.env.APP_PASSWORD;
}

// ── SMS via Twilio ────────────────────────────────────────────────────────────
async function sendSMS(to, body) {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  return client.messages.create({
    from: process.env.TWILIO_FROM_NUMBER,
    to,
    body,
  });
}

// ── AI comment suggestions (optional) ────────────────────────────────────────
async function getCommentSuggestions(platform, caption) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const tones = {
    linkedin:  "professional, thought-leadership, mention recovery/performance ROI",
    instagram: "enthusiastic, emoji-friendly, lifestyle/athlete culture",
    twitter:   "punchy, 1-2 sentences, optional hot take or stat",
    tiktok:    "energetic, casual, short",
    facebook:  "warm, community-focused, invite conversation",
    youtube:   "enthusiastic, reference the video content, encourage watching and subscribing",
  };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: "Return only a valid JSON array of 3 strings. No explanation.",
    messages: [{
      role: "user",
      content:
        `Generate 3 short authentic comments Shiftwave employees can post on a ${platform} post. ` +
        `Tone: ${tones[platform.toLowerCase()] ?? tones.linkedin}. ` +
        `Brand: wearable nervous system regulation device, NFL/athlete users. ` +
        (caption ? `Post content: "${caption}". ` : "") +
        `Rules: 1-2 sentences each, sound like a real person, not identical. ` +
        `Return JSON array: ["comment1","comment2","comment3"]`,
    }],
  });

  return JSON.parse(res.content[0].text.trim());
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS for browser requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-app-password");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const { platform, post_url, custom_message, caption } = req.body ?? {};

  if (!platform) {
    return res.status(400).json({ error: "platform is required" });
  }

  // Build the SMS message text
  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase();
  const body = custom_message?.trim() || `We just posted on ${platformLabel}`;

  let message = post_url?.trim() ? `${body}\n\n${post_url.trim()}` : body;

  // Append AI comment suggestions if available
  try {
    const suggestions = await getCommentSuggestions(platform, caption);
    if (suggestions?.length) {
      message +=
        "\n\nComment ideas:\n" +
        suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");
    }
  } catch (err) {
    // Non-fatal — send without suggestions
    console.warn("Could not generate comment suggestions:", err.message);
  }

  // Append leaderboard reply instructions
  message += "\n\nEngaged? Reply LIKE (1pt), COMMENT (2pt), or BOTH (3pt) to earn points!";

  // Load team contacts
  const team = (await readContacts()).filter((m) => m.phone);

  if (!team.length) {
    return res.status(400).json({ error: "No contacts found — add phone numbers in the Contacts tab first" });
  }

  // Set active post + eligibility list (only people who received this notification can earn points)
  try {
    const postId = Date.now().toString(36);
    const eng    = await readEngagement();
    eng.activePost = { id: postId, platform: platformLabel.toLowerCase(), url: post_url, sentAt: new Date().toISOString() };
    if (!eng.eligibility) eng.eligibility = {};
    eng.eligibility[postId] = team.map((m) => m.phone);
    // Keep eligibility map bounded to last 30 posts
    const eIds = Object.keys(eng.eligibility);
    if (eIds.length > 30) eIds.slice(0, eIds.length - 30).forEach((id) => delete eng.eligibility[id]);
    await saveEngagement(eng);
  } catch (err) {
    console.warn("Could not set active post:", err.message);
  }

  // Send to everyone concurrently
  const results = await Promise.allSettled(
    team.map((member) => sendSMS(member.phone, message))
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results
    .map((r, i) => ({ ...team[i], reason: r.reason?.message }))
    .filter((_, i) => results[i].status === "rejected");

  console.log(`[${new Date().toISOString()}] ${platformLabel} — sent: ${sent}/${team.length}`);

  return res.status(200).json({
    ok: true,
    sent,
    total: team.length,
    failed,
    preview: message, // returned so the UI can show exactly what was sent
  });
}
