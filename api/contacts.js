/**
 * /api/contacts
 *
 * GET  — returns the full contact list
 * POST — adds or removes a contact
 *   body { action: "add",    name: string, phone: string }
 *   body { action: "remove", phone: string }
 */

import { readContacts, saveContacts } from "./_store.js";

function isAuthorized(req) {
  return req.headers["x-app-password"] === process.env.APP_PASSWORD;
}

function normalizePhone(raw) {
  // Strip everything except digits and leading +
  const digits = raw.replace(/[^\d+]/g, "");
  // Prepend +1 if it looks like a 10-digit US number
  if (/^\d{10}$/.test(digits)) return `+1${digits}`;
  return digits;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-app-password");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── GET: return full list ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const contacts  = await readContacts();
    const blobReady = !!process.env.VERCEL_TOKEN;
    return res.status(200).json({ contacts, blobReady });
  }

  // ── POST: add or remove ────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { action, name, phone } = req.body ?? {};

    if (!action) {
      return res.status(400).json({ error: "action is required (add or remove)" });
    }

    let contacts = await readContacts();

    if (action === "add") {
      if (!phone) return res.status(400).json({ error: "phone is required" });

      const normalized = normalizePhone(phone);
      if (!normalized) return res.status(400).json({ error: "Invalid phone number" });

      // Prevent duplicates
      if (contacts.some((c) => normalizePhone(c.phone) === normalized)) {
        return res.status(409).json({ error: "That number is already on the list" });
      }

      contacts.push({ name: name?.trim() || "Team Member", phone: normalized });

    } else if (action === "remove") {
      if (!phone) return res.status(400).json({ error: "phone is required" });
      contacts = contacts.filter((c) => c.phone !== phone);

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    try {
      await saveContacts(contacts);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(200).json({ ok: true, contacts });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
