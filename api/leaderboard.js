/**
 * /api/leaderboard
 *
 * GET  — returns sorted leaderboard + active post info
 * POST { action: "reset" } — wipes all scores (admin only)
 */

import { readEngagement, saveEngagement } from "./_engagement.js";

function isAuthorized(req) {
  return req.headers["x-app-password"] === process.env.APP_PASSWORD;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-app-password");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const eng    = await readEngagement();
    const scores = eng.scores || {};

    const leaderboard = Object.entries(scores)
      .map(([phone, d]) => ({ phone, name: d.name, points: d.points, likes: d.likes, comments: d.comments, both: d.both }))
      .sort((a, b) => b.points - a.points);

    return res.status(200).json({ leaderboard, activePost: eng.activePost ?? null });
  }

  if (req.method === "POST") {
    const { action } = req.body ?? {};

    if (action === "reset") {
      const eng  = await readEngagement();
      eng.scores    = {};
      eng.responded = {};
      await saveEngagement(eng);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
