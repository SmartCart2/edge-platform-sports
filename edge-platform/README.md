# EDGE Platform

Sports betting intelligence — live odds, historical signals, transparent track record.

## Stack
- **Frontend**: React + Vite, deployed on Vercel
- **Backend**: Vercel Serverless Functions (API proxy)
- **Database**: Supabase (auth + signals + leaderboard)
- **Odds**: The Odds API (free tier, 500 req/month)

---

## Deploy in 4 Steps

### 1. Set up Supabase
1. Go to [supabase.com](https://supabase.com) → New project → name it `edge`
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run
3. Go to **Settings → API** → copy:
   - `Project URL` → this is your `VITE_SUPABASE_URL`
   - `anon public` key → this is your `VITE_SUPABASE_ANON_KEY`

### 2. Get your Odds API key
1. Go to [the-odds-api.com](https://the-odds-api.com) → Sign up free
2. Copy your API key → this is your `ODDS_API_KEY`

### 3. Push to GitHub
```bash
cd edge-platform
git init
git add .
git commit -m "initial commit"
gh repo create edge-platform --public --push
```
(or create the repo on github.com and follow their instructions)

### 4. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → import your `edge-platform` repo
2. Framework preset: **Vite**
3. Add environment variables:
   ```
   ODDS_API_KEY          = your_odds_api_key
   VITE_SUPABASE_URL     = https://yourproject.supabase.co
   VITE_SUPABASE_ANON_KEY = your_anon_key
   ```
4. Click **Deploy** → done

Vercel auto-deploys on every git push.

---

## Local Development
```bash
npm install
cp .env.example .env.local
# fill in .env.local with your keys
npm run dev
```

---

## What's Built

| Page | URL | What it does |
|------|-----|--------------|
| Today's Slate | `/` | Live odds for today's games, signal engine runs automatically |
| Game Detail | `/game/:id` | Full signal breakdown, props, signal logger |
| Search | `/search?q=` | Search any player or team, see their props and game odds |
| My Signals | `/signals` | Personal signal tracker with ROI curve |
| Track Record | `/track` | Public leaderboard, all graded signals |
| Auth | `/auth` | Email signup/login via Supabase |

## Adding a Custom Domain
1. Vercel → Project → Settings → Domains → Add your domain
2. Add the DNS records shown (usually a CNAME pointing to `cname.vercel-dns.com`)
3. Wait ~5 minutes → SSL auto-provisions

---

## Upgrading Data

**Refresh NFL stats:**
```bash
python3 edge_scraper.py --fetch --build
# copy nfl_ats_stats.json to src/data/nfl.js as JS export
```

**Refresh MLB stats:**
Update `src/data/mlb.js` at start of each season.

## Roadmap
- [ ] NBA + NHL signal engines
- [ ] Line movement tracking (compare to opening line)
- [ ] Email alerts when strong signal fires
- [ ] Stripe subscription ($19/mo Pro tier)
- [ ] Mobile app (React Native)
