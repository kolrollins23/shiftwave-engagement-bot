/**
 * /api/sms-webhook
 *
 * Twilio inbound SMS webhook. Receives replies from team members
 * (LIKE, COMMENT, BOTH) and logs points to the engagement leaderboard.
 *
 * Set this URL as the "A message comes in" webhook on your Twilio number:
 *   https://social-engagement-bot.vercel.app/api/sms-webhook
 *   Method: HTTP POST
 */

import { readContacts } from "./_store.js";
import { readEngagement, saveEngagement } from "./_engagement.js";

const POINTS  = { like: 1, comment: 2, both: 3 };

function twiml(msg) {
  // Escape XML special chars
  const safe = msg.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

function parseAction(body) {
  const upper = (body || "").trim().toUpperCase();
  if (upper === "LIKE")    return "like";
  if (upper === "COMMENT") return "comment";
  if (upper === "BOTH")    return "both";
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "text/xml");

  if (req.method !== "POST") return res.status(405).send(twiml("Method not allowed"));

  const from   = req.body?.From  || "";
  const body   = req.body?.Body  || "";
  const action = parseAction(body);

  // Unknown reply — send help text (but don't respond to STOP/HELP to avoid interfering with opt-out)
  const upper = body.trim().toUpperCase();
  if (upper === "STOP" || upper === "HELP" || upper === "UNSTOP") {
    // Let Twilio handle opt-out/help natively — send no response
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }

  if (!action) {
    return res.send(twiml(
      "Reply LIKE (1pt), COMMENT (2pt), or BOTH (3pt) after engaging with a Shiftwave post to log your points!"
    ));
  }

  // Verify sender is on the team
  const contacts = await readContacts();
  const contact  = contacts.find((c) => c.phone === from);
  if (!contact) {
    return res.send(twiml("Your number isn't on the Shiftwave team list. Ask your admin to add you."));
  }

  // Load engagement state
  const eng = await readEngagement();

  // Check there's an active post
  if (!eng.activePost) {
    return res.send(twiml("No active post right now. Points are tracked for 48 hours after each notification goes out."));
  }

  // Eligibility check — only award points to people who received this notification
  const eligibility = eng.eligibility || {};
  const isEligible  = (eligibility[eng.activePost.id] || []).includes(from);
  if (!isEligible) {
    return res.send(twiml("Your reply can't be counted — you weren't on the team list when this notification was sent. Ask your admin to add you."));
  }

  // Deduplicate — one response per person per post
  const responded = eng.responded || {};
  const alreadyReplied = (responded[eng.activePost.id] || []).includes(from);
  if (alreadyReplied) {
    return res.send(twiml(
      `You already logged your engagement for this ${eng.activePost.platform} post! Points are counted. 👏`
    ));
  }

  // Award points
  const pts    = POINTS[action];
  const scores = eng.scores || {};

  if (!scores[from]) {
    scores[from] = { name: contact.name, points: 0, likes: 0, comments: 0, both: 0 };
  }
  scores[from].name = contact.name; // keep name in sync
  scores[from].points   += pts;
  if (action === "like")    scores[from].likes    += 1;
  if (action === "comment") scores[from].comments += 1;
  if (action === "both")    scores[from].both     += 1;

  // Mark responded
  if (!responded[eng.activePost.id]) responded[eng.activePost.id] = [];
  responded[eng.activePost.id].push(from);

  eng.scores    = scores;
  eng.responded = responded;
  await saveEngagement(eng);

  const label    = action === "like" ? "like" : action === "comment" ? "comment" : "like + comment";
  const platform = eng.activePost.platform.charAt(0).toUpperCase() + eng.activePost.platform.slice(1);

  return res.send(twiml(
    `+${pts}pt logged for your ${label} on the ${platform} post! Total: ${scores[from].points}pts. Keep it up! 🔥`
  ));
}
