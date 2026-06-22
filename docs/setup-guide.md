# Shiftwave Engagement Bot — Setup Guide

No server. No always-on Mac. Everything runs on free Vercel hosting.
The only thing that costs money is Twilio (~$4–5/month).

Estimated time: 45 minutes.

---

## Step 1: Get a Twilio account and phone number (15 min)

Twilio is the service that sends the SMS messages.

1. Go to **twilio.com** → Create a free account
2. Verify your email and phone number
3. On the dashboard, note your **Account SID** and **Auth Token** (you'll need these soon)
4. In the left sidebar: **Phone Numbers → Manage → Buy a number**
   - Search for a number in your area code
   - Make sure **SMS** capability is checked
   - Buy it — costs ~$1.15/month
5. Note the phone number (e.g. `+19195550042`) — this is what your team will see SMS come from

**Cost so far:** ~$1.15/month (the number)

---

## Step 2: Put the project on GitHub (5 min)

Vercel deploys from GitHub. You need to push this project there.

1. Go to **github.com** → sign in → click **New repository**
2. Name it `shiftwave-notify` → **Create repository** (keep it Private)
3. On your Mac, open Terminal and run:
   ```bash
   cd ~/Desktop/social-engagement-bot
   git init
   git add .
   git commit -m "Initial setup"
   git remote add origin https://github.com/YOUR_USERNAME/shiftwave-notify.git
   git push -u origin main
   ```
   (Replace `YOUR_USERNAME` with your GitHub username)

---

## Step 3: Deploy to Vercel (10 min)

1. Go to **vercel.com** → sign up with your GitHub account
2. Click **Add New Project** → select `shiftwave-notify` from your repos
3. Click **Deploy** — Vercel will build it automatically

Now set your environment variables in Vercel:

4. Go to your project on Vercel → **Settings → Environment Variables**
5. Add these one at a time:

| Name | Value |
|------|-------|
| `APP_PASSWORD` | Any password you choose (e.g. `shiftwave2026`) |
| `TWILIO_ACCOUNT_SID` | From your Twilio dashboard |
| `TWILIO_AUTH_TOKEN` | From your Twilio dashboard |
| `TWILIO_FROM_NUMBER` | Your Twilio phone number (e.g. `+19195550042`) |
| `ANTHROPIC_API_KEY` | Optional — skip if you don't want AI comment suggestions |

6. After adding variables: **Settings → Deployments → Redeploy** (to apply the new env vars)

Your app is now live at something like: `https://shiftwave-notify.vercel.app`

---

## Step 4: Add team phone numbers (5 min)

Edit `team.json` and add everyone who should receive notifications:

```json
[
  { "name": "Gordon",     "phone": "+19195551001" },
  { "name": "Jane Smith", "phone": "+19195551002" },
  { "name": "Alex Lee",   "phone": "+14155551003" }
]
```

Rules:
- Phone numbers **must include country code** (US = +1)
- Works for both iPhone and Android — delivers as a regular SMS text
- After editing, push to GitHub: Vercel auto-redeploys in ~30 seconds

```bash
git add team.json
git commit -m "Add team contacts"
git push
```

---

## Step 5: Test it (5 min)

1. Add your own number to `team.json` first
2. Open your Vercel app URL in a browser
3. Enter the `APP_PASSWORD` you set
4. Select LinkedIn, paste any URL, click **Send to Team**
5. You should receive a text within a few seconds

If it works: add all team members.

---

## Step 6: Share with the team (2 min)

Bookmark the Vercel URL on your phone's home screen:
- iPhone: Safari → Share → **Add to Home Screen**
- Android: Chrome → three dots → **Add to Home Screen**

It opens like an app — no install required.

Share the URL and password with anyone authorized to send notifications.

---

## How to add/remove team members going forward

Edit `team.json` via GitHub's web editor (no need to open a code editor):

1. Go to your repo on github.com
2. Click `team.json`
3. Click the pencil icon (edit)
4. Add or remove entries
5. Scroll down → **Commit changes**

Vercel picks up the change and redeploys in ~30 seconds. Done.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Incorrect password" | Double-check the `APP_PASSWORD` env var in Vercel settings; re-deploy after changing |
| SMS not delivered | Verify the number format includes +1; check Twilio dashboard for error logs |
| "Could not read team.json" | Push team.json to GitHub and wait for Vercel to redeploy |
| App shows blank page | Check Vercel deployment logs for build errors |
| Twilio says "unverified number" | On Twilio **free trial**, you can only text verified numbers. Upgrade to a paid account ($0 minimum balance required) to text anyone |

---

## Monthly cost summary

| Item | Cost |
|------|------|
| Twilio phone number | $1.15/month |
| Twilio SMS (40 people × 10 posts) | ~$3.16/month |
| Vercel hosting | $0 |
| Anthropic AI suggestions (optional) | ~$0.01/month |
| **Total** | **~$4.32/month** |
