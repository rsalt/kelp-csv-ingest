# kelp-csv-ingest

CSV → PostgreSQL ingest with a small web UI. Needs **Node 18+** and a Postgres database.

```bash
npm install
```

Created a `.env` in the project root (at minimum):

```env
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

```bash
npm run db:init
npm start
```

App: **http://localhost:3000** · `npm run dev` watches and restarts the server.

Optional env: `PORT`, `CSV_FILE_PATH`, `INGEST_BATCH_SIZE`, `INGEST_ON_START`.
