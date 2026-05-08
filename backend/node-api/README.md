# Smart Attendance Node API — Local development

This folder contains a small Express-based API scaffold used during the migration from PHP to Node.js.

Quick start (with Docker Postgres):

1. Start a local PostgreSQL instance (the `sql/schema.sql` file will run on first start):

```bash
cd backend/node-api
docker compose up -d
```

2. Create a `.env` (copy from `.env.example`) and set `DATABASE_URL` to:

```
postgresql://postgres:password@localhost:5432/smart_attendance
```

3. Install dependencies and run the API locally:

```bash
npm install
npm run dev
```

4. The API should be reachable at `http://localhost:3001` (unless you changed `PORT`).

Notes:
- The compose file exposes Postgres on `5432` and seeds the DB from `./sql/schema.sql` on first run.
- If you run Postgres elsewhere, update `DATABASE_URL` accordingly.
- The `auth` routes currently implement `register` and `login` using JWT; password reset is a TODO.
