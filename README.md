# Shiftwave Social Engagement Bot

Web app → one button → SMS to the whole team.

No server to maintain. No always-on Mac. Just open the URL, fill in the post details, hit Send.

## Architecture

```
Anyone on the team (phone or laptop)
        │  tap button after publishing
        ▼
  Web App  (Vercel, free, works from any browser/phone)
  - Login with shared password
  - Pick platform, paste URL, optional custom message
  - Click "Send to Team"
        │
        ▼  POST /api/send  (Vercel serverless — no server needed)
        │
        ├──▶ Claude Haiku  →  3 comment suggestions  (optional)
        │
        ▼
  Twilio SMS API
        │
        ▼
  SMS to every number in team.json
```

## Files

```
api/send.js        — Serverless function: auth check → Twilio → Claude
public/index.html  — Login + compose UI (single file, no frameworks)
team.json          — Contact list (edit and push to GitHub to update)
docs/setup-guide.md
```

## Setup

See [docs/setup-guide.md](docs/setup-guide.md). Takes ~45 minutes.

## Cost

~$4.32/month — entirely Twilio (phone number + SMS). Vercel is free.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_PASSWORD` | Yes | Login password for the web app |
| `TWILIO_ACCOUNT_SID` | Yes | From twilio.com dashboard |
| `TWILIO_AUTH_TOKEN` | Yes | From twilio.com dashboard |
| `TWILIO_FROM_NUMBER` | Yes | Twilio phone number, e.g. `+19195550042` |
| `ANTHROPIC_API_KEY` | No | Enables AI comment suggestions |
