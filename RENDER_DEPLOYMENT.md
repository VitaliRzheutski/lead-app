Changes made
API (apps/api/src/index.ts)
CORS uses FRONTEND_URL (falls back to http://localhost:5173 in dev)
Port uses PORT or API_PORT so it works on Render
Deployment guide
Added RENDER_DEPLOYMENT.md with step-by-step instructions
.env.example
Documented FRONTEND_URL and API_BASE_URL for production
Quick reference
Service	Root Dir	Build	Start (API)
API	apps/api	npm install --include=dev && npm run build	npm run migrate:prod && npm run start
Web	apps/web	npm install && npm run build	—
Web	Publish	—	dist
The guide walks through creating the PostgreSQL database, API Web Service, and Static Site, and lists all required environment variables.

# Render Deployment Guide — Lead Inspection App

Deploy the Lead app (API + Web) on Render's free tier.

---

## Prerequisites

- [Render](https://render.com) account (free)
- Code pushed to GitHub
- Supabase project (for storage) — optional if you use it

---

## Part 1: PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com) → **New +** → **PostgreSQL**
2. Name: `lead-app-db`
3. Region: choose closest to you
4. Create Database
5. When ready, open **Internal Database URL** — you'll use this for `DATABASE_URL`

> **Note:** Use the **Internal** URL when API and DB are on Render (faster, free). Use **External** if the API runs elsewhere.

---

## Part 2: API (Web Service)

1. **New +** → **Web Service**
2. Connect your GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `lead-app-api` |
| **Region** | Same as database |
| **Root Directory** | `apps/api` |
| **Runtime** | Node |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run migrate:prod && npm run start` |

4. **Environment Variables** — add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(from Part 1 — Internal Database URL)* |
| `JWT_SECRET` | *(generate a long random string, e.g. `openssl rand -hex 32`)* |
| `FRONTEND_URL` | `https://your-web-service.onrender.com` *(update after Part 3)* |
| `API_BASE_URL` | `https://lead-app-api.onrender.com` *(your API URL)* |
| `PUPPETEER_CACHE_DIR` | `./.cache/puppeteer` *(so Puppeteer finds Chromium; path is relative to service root `apps/api`)* |

5. **Supabase** (if using):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_UPLOADS_BUCKET` (optional, default: `uploads`)
   - `SUPABASE_REPORTS_BUCKET` (optional, default: `reports`)

6. Create Web Service
7. Copy the service URL (e.g. `https://lead-app-api.onrender.com`)

---

## Part 3: Web (Static Site)

1. **New +** → **Static Site**
2. Connect the same GitHub repo
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `lead-app-web` |
| **Root Directory** | *(leave blank — use repo root)* |
| **Build Command** | `npm install && npm run build:web` |
| **Publish Directory** | `apps/web/dist` |

4. **Environment Variables** — add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://lead-app-api.onrender.com` *(your API URL from Part 2)* |

5. Create Static Site
6. Copy the site URL (e.g. `https://lead-app-web.onrender.com`)

---

## Part 4: Connect Frontend and CORS

1. In **API** (Web Service) → **Environment** → edit `FRONTEND_URL`:
   - Set to your Static Site URL: `https://lead-app-web.onrender.com`
2. Save (API will redeploy)

---

## Part 5: Report (PDF) generation on Render

Puppeteer needs Chromium in a path Render can see. The API uses `puppeteer.config.cjs` so the cache is inside the service (`apps/api/.cache/puppeteer`). The postinstall script installs Chrome during build.

- **If "Generate Report" still returns 500:** In the API service on Render go to **Environment** and add `PUPPETEER_CACHE_DIR` = `./.cache/puppeteer`. Then use **Manual Deploy** → **Clear build cache and deploy** so the next build runs a fresh `npm install` and downloads Chromium into that directory.
- Free tier has 512MB RAM; very large reports can hit memory limits.

---

## Part 6: Run Migrations (First Time)

Migrations run automatically via `npm run migrate:prod` in the Start Command. If you need to run them manually:

1. API service → **Shell** tab
2. Run: `npm run migrate:prod`

---

## Summary: Environment Variables

### API (Web Service)

```
NODE_ENV=production
DATABASE_URL=<from Render PostgreSQL>
JWT_SECRET=<random secure string>
FRONTEND_URL=https://lead-app-web.onrender.com
API_BASE_URL=https://lead-app-api.onrender.com
PUPPETEER_CACHE_DIR=./.cache/puppeteer
```

### Web (Static Site)

```
VITE_API_URL=https://lead-app-api.onrender.com
```

---

## Free Tier Notes

- **Cold starts:** API sleeps after ~15 min inactivity. First request can take 30–60 seconds.
- **Database:** Free Postgres has a 90‑day expiration; you can create a new one.
- **Puppeteer:** PDF generation may be unreliable on free tier; consider alternatives if needed.
- **File storage:** Use Supabase Storage; local disk on Render is ephemeral.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Ensure `FRONTEND_URL` exactly matches your static site URL (no trailing slash) |
| 502 / API not responding | Check API logs; verify `DATABASE_URL` and migrations |
| Build fails | Check Root Directory is `apps/api` or `apps/web` |
| Login/Register fails | Verify `JWT_SECRET` is set and `VITE_API_URL` points to API |
| **500 on Generate Report** | Puppeteer needs Chromium. The API uses `puppeteer.config.cjs` and a postinstall to install Chrome. Redeploy; if it still fails, check API logs for "Could not find Chrome" and consider upgrading to a paid Render plan for more memory. |
