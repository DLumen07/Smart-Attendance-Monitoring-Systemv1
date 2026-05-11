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

Optional checks:

```bash
npm run db:check
npm run smoke:auth
npm run smoke:reset
```

4. The API should be reachable at `http://localhost:3001` (unless you changed `PORT`).

Notes:
- The compose file exposes Postgres on `5432` and seeds the DB from `./sql/schema.sql` on first run.
- If you already created the DB before we added parent/reset columns, run `sql/patch-auth.sql` once.
- If you run Postgres elsewhere, update `DATABASE_URL` accordingly.
- If you see `ECONNREFUSED ::1`, use `127.0.0.1` in `DATABASE_URL` to avoid IPv6 loopback issues.
- Forgot-password requires SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) or it will return 503.
- The `auth` routes now include register/login plus forgot/reset password with reset codes.
