/**
 * _store.js — contacts persistence via Vercel environment variable.
 *
 * Reads from  TEAM_CONTACTS_JSON (set at deploy time / updated via API).
 * Writes by   PATCHing the env var value through the Vercel REST API so the
 *             next cold-start Lambda reads the latest list.
 *
 * Falls back to team.json when TEAM_CONTACTS_JSON is not set (local dev).
 */

import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Vercel project / env-var identifiers (non-secret — just IDs)
const PROJECT_ID = "prj_D8qCIgqPLzYrdJY6XbRmJKSN4Kyw";
const TEAM_ID    = "team_TMacAd6rbzrEJbsnqVYSFa3P";
const ENV_VAR_ID = "GOhaBn2gOKXK2Gun"; // id of TEAM_CONTACTS_JSON

// ── Module-level cache ────────────────────────────────────────────────────────
// Keeps writes visible within the same warm Lambda instance.
let _cache = null;

// ── Read ──────────────────────────────────────────────────────────────────────
export async function readContacts() {
  if (_cache !== null) return _cache;

  // Primary: env var injected by Vercel at cold-start
  const raw = process.env.TEAM_CONTACTS_JSON;
  if (raw) {
    try {
      _cache = JSON.parse(raw);
      return _cache;
    } catch (err) {
      console.warn("TEAM_CONTACTS_JSON parse error, falling back:", err.message);
    }
  }

  // Fallback: static team.json (local dev / safety net)
  try {
    const text = await readFile(join(__dirname, "..", "team.json"), "utf8");
    _cache = JSON.parse(text);
    return _cache;
  } catch {
    _cache = [];
    return _cache;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────────
export async function saveContacts(contacts) {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error(
      "VERCEL_TOKEN is not set — cannot persist contacts. " +
      "Add it as a Vercel environment variable (encrypted, production)."
    );
  }

  const payload = JSON.stringify(contacts);

  const res = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${ENV_VAR_ID}?teamId=${TEAM_ID}`,
    {
      method:  "PATCH",
      headers: {
        Authorization:  `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value:  payload,
        type:   "encrypted",
        target: ["production", "preview"],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vercel env update failed (${res.status}): ${err}`);
  }

  // Update in-memory cache so same Lambda sees the change immediately
  _cache = contacts;

  // Also update the in-process env so readContacts() stays consistent
  process.env.TEAM_CONTACTS_JSON = payload;
}
