# Torah Center Classes

A media app for The Torah Center of Atlanta — pulls video shiurim from YouTube
and audio shiurim from SoundCloud, auto-tags each by the playlists/sets it
belongs to, merges cross-posted classes into one entry, and serves it all as
one searchable, filterable, chronological feed.

## Status

**Phase 1 (this scaffold):** project structure, backend integrations
(YouTube + SoundCloud pull, playlist-based auto-tagging, cross-platform
duplicate matching, hourly-refreshed cache, unified feed API), and a working
frontend feed (search, type filter, series/topic filter, featured playlists
row) styled from the Claude Design handoff. Runs today against a **demo
dataset** — see below to connect it to your real channel/account.

**Phase 2 (next):** class detail screen, embedded YouTube video player,
persistent Spotify-style audio mini-player + full "Now Playing" view, Saved
tab persistence, share/download actions.

## Project layout

```
backend/     FastAPI app — pulls + caches + merges + serves the feed
frontend/    React + Vite + Tailwind app — the UI from the design handoff
render.yaml  Render Blueprint for deploying both services at once
```

## Running locally

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in your API keys, see below
uvicorn app.main:app --reload --port 8000
```

Requires **Python 3.10+** (pydantic's modern type syntax needs it — 3.9 will
error on startup).

With `.env` empty/unfilled, the API automatically serves a small built-in
demo dataset (`app/demo_data.py`) so the app has something to render. As soon
as real credentials are set, demo data is never used again.

- `GET /api/health` — sanity check + whether YouTube/SoundCloud are configured
- `GET /api/classes?q=&type=&series=` — the unified feed
- `GET /api/series` — list of all series/playlist names
- `POST /api/refresh` — force an immediate re-pull (mainly for testing —
  it already refreshes hourly on its own)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens on `http://localhost:5173` and proxies `/api` to `http://localhost:8000`
(see `vite.config.js`). No env var needed locally.

## Connecting your real YouTube channel

1. In [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com),
   enable **YouTube Data API v3** on a project, then create an API key under
   *Credentials* (restrict it to that API).
2. Get your channel's `UC...` id — easiest way: go to your channel, click
   *Share channel*, and the resulting URL/handle can be resolved to the
   `UC...` id via `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@yourhandle&key=YOUR_KEY`.
3. Set `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID` in `backend/.env`.

Series tags come automatically from every playlist on the channel — no
manual tagging needed. A video in multiple playlists gets multiple series
tags.

## Connecting your real SoundCloud account

SoundCloud stopped approving new public API (v1) client registrations years
ago. This app instead talks to `api-v2.soundcloud.com` — the same public,
unauthenticated endpoint soundcloud.com's own web player uses to read public
tracks and playlists. It needs a `client_id`, which is **not a secret or a
login credential** — it's a public id embedded in soundcloud.com's own page
source, used for anonymous requests to public data only.

To get one: open `soundcloud.com` in a browser, open DevTools → Network,
reload the page, and copy the `client_id` query parameter from any request to
`api-v2.soundcloud.com`. Set that as `SOUNDCLOUD_CLIENT_ID`, and set
`SOUNDCLOUD_USERNAME` to the account's permalink (e.g. for
`soundcloud.com/torah-center-atlanta` that's `torah-center-atlanta`).

This id can occasionally rotate when SoundCloud redeploys their web app — if
`/api/health` starts showing SoundCloud errors, just grab a fresh one the
same way. If you'd rather use an officially sanctioned integration, you can
also request access to the real SoundCloud API at
https://developers.soundcloud.com/ (approval isn't guaranteed) — the code
would need a small adjustment to point at `api.soundcloud.com` (v1) instead.

Series tags come from every SoundCloud playlist ("set") the account owns, the
same way as YouTube.

## How duplicate classes are merged

When a class is uploaded as both a YouTube video and a SoundCloud track
(`backend/app/services/matcher.py`), they're matched when:
- their titles fuzzy-match above a threshold (handles minor wording/emoji
  differences), **and**
- their publish dates are within 3 days of each other

Matched pairs collapse into a single feed entry tagged `types: ["video",
"audio"]` with both playback sources attached — so the class detail /
player screens (phase 2) can offer both.

## Deployment recommendation: Render

**Use Render for both the backend and the frontend.** Since you already run
a FastAPI microservice there, this keeps everything — deploys, logs, env
vars, billing — in one dashboard instead of splitting across two platforms.
`render.yaml` in this repo is a Render *Blueprint*: pushing this repo and
clicking "New +. Blueprint" in Render spins up both services (a Python web
service for the API, a static site for the frontend) in one shot. You'll be
prompted to fill in the YouTube/SoundCloud secrets in the dashboard.

**Tradeoffs vs. Vercel** (for the frontend only — you'd still need Render or
similar for the FastAPI backend either way, since Vercel doesn't run
long-lived Python processes):
- Vercel has a slightly nicer static-hosting DX (per-PR preview URLs, faster
  global edge network) — a real but minor upgrade for a low-traffic
  nonprofit site.
- Splitting frontend/backend across two platforms means two dashboards, two
  sets of env vars to keep in sync (the frontend needs the backend's URL),
  and two places to check when something breaks.
- Given you already know Render's workflow, single-platform simplicity wins
  here. If you later want Vercel's frontend polish, swapping is cheap — it's
  just a static Vite build, no backend logic moves.

**One caveat on Render's free tier:** free web services spin down after 15
minutes of no traffic. This app already refreshes its feed once at startup
(`app/cache.py`), so a cold start just means the first visitor after a quiet
period waits through one YouTube/SoundCloud pull (a few seconds) instead of
hitting a warm cache — not broken, just occasionally slower. If that's not
acceptable, the $7/mo Starter instance keeps it always warm and the hourly
background refresh reliably fires in the background.
