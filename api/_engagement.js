/**
 * _engagement.js — leaderboard data persistence via Vercel env var.
 *
 * Structure stored in ENGAGEMENT_DATA_JSON:
 * {
 *   scores:    { "+1xxx": { name, points, likes, comments, both } },
 *   responded: { "postId": ["+1xxx", "+1yyy"] },   // dedup per post
 *   activePost: { id, platform, url, sentAt } | null
 * }
 */

const PROJECT_ID = "prj_D8qCIgqPLzYrdJY6XbRmJKSN4Kyw";
const TEAM_ID    = "team_TMacAd6rbzrEJbsnqVYSFa3P";
const ENV_VAR_ID = "wYgA6GY9GbTMilGg"; // id of ENGAGEMENT_DATA_JSON

const EMPTY = { scores: {}, responded: {}, activePost: null };

let _cache = null;

export async function readEngagement() {
  if (_cache !== null) return _cache;
  const raw = process.env.ENGAGEMENT_DATA_JSON;
  if (raw) {
    try { _cache = JSON.parse(raw); return _cache; } catch {}
  }
  _cache = JSON.parse(JSON.stringify(EMPTY));
  return _cache;
}

export async function saveEngagement(data) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not set");

  // Keep responded map to last 30 posts to stay under env var size limits
  if (data.responded) {
    const ids = Object.keys(data.responded);
    if (ids.length > 30) {
      ids.slice(0, ids.length - 30).forEach((id) => delete data.responded[id]);
    }
  }

  const payload = JSON.stringify(data);
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${ENV_VAR_ID}?teamId=${TEAM_ID}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ value: payload, type: "encrypted", target: ["production", "preview"] }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Engagement save failed (${res.status}): ${err}`);
  }

  _cache = data;
  process.env.ENGAGEMENT_DATA_JSON = payload;
}
