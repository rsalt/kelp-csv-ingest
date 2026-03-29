# Kelp CSV → Postgres

Express API: stream CSV rows into PostgreSQL, map dotted columns to nested JSON, print age-group distribution.

## Stack

- Node 18+, Express, `pg`, `csv-parse`, `multer` (optional browser upload)

## Setup

```bash
npm install
cp .env.example .env   # or create .env — see below
```

**`.env` (do not commit)**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL URI (Render **External** URL from your laptop) |
| `PORT` | Optional, default `3000` |
| `CSV_FILE_PATH` | Optional. Path to CSV on disk for `POST /api/ingest` (e.g. `./data/sample.csv`) |
| `DATABASE_SSL` | Use `false` **only** for local Postgres without TLS |
| `INGEST_ON_START` | `true` to ingest on boot (optional) |

Create tables once:

```bash
npm run db:init
```

Run:

```bash
npm start
```

Open **http://localhost:3000/** — upload a CSV or use server-side import.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/api/report` | Age distribution JSON |
| POST | `/api/ingest` | Import file at `CSV_FILE_PATH` |
| POST | `/api/ingest/upload` | Multipart form field `csv` — **works on Render without a repo CSV** |

## Push to GitHub

```bash
git add .
git commit -m "Describe your change"
git push origin main
```

Create an empty repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Do **not** commit `.env` (it is gitignored).

## Deploy (Render)

1. **PostgreSQL** on Render — copy Internal URL for the Web Service env.
2. **Web Service** — connect repo, build `npm install`, start `npm start`.
3. Env: `DATABASE_URL` (Internal), optional `CSV_FILE_PATH=./data/sample.csv` if the file is in the repo.
4. Run `npm run db:init` **once** against the DB (from your laptop with External URL, or Render Shell).
5. Use the site’s **Upload CSV** or set `CSV_FILE_PATH` and use **Import server file**.

## Assumptions (brief)

- First three columns: `name.firstName`, `name.lastName`, `age`.
- `name` column = first + last; `address.*` → `address` jsonb; other fields → `additional_info`.
- Re-running ingest **appends** rows (truncate manually if you need a clean load).
