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
npm run seed:demo
npm run smoke:auth
npm run smoke:reset
npm run smoke:classes
```

4. The API should be reachable at `http://localhost:3001` (unless you changed `PORT`).

Notes:
- The compose file exposes Postgres on `5432` and seeds the DB from `./sql/schema.sql` on first run.
- If you already created the DB before we added new tables/columns, run `sql/patch-core.sql` and `sql/patch-auth.sql` once.
- If you run Postgres elsewhere, update `DATABASE_URL` accordingly.
- If you see `ECONNREFUSED ::1`, use `127.0.0.1` in `DATABASE_URL` to avoid IPv6 loopback issues.
- Forgot-password requires SMTP settings (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) or it will return 503.
- Attendance alert emails (3 consecutive absences) require `ATTENDANCE_EMAIL_ENABLED=true`, SMTP settings, and parent emails on student records.
- The `auth` routes now include register/login plus forgot/reset password with reset codes.
- Register accepts split name fields (`firstName`, optional `middleName`, `lastName`) and also supports legacy `fullName` payloads.
- Student registration also collects year level, program/department, section/class group, and student ID (format `00-00-0000`).
- Register enforces backend sanitization and validation for name parts, email format, password length, and password/confirm-password matching when provided.
- Instructor registrations are stored as `pending` and cannot sign in until approved by an admin.
- Admin-only routes are available under `/admin` for:
	- Instructor approval (`GET /admin/pending-instructors`, `POST /admin/instructors/:userId/approve`)
	- Activity logs (`GET /admin/activity-logs`)
	- Platform analytics (`GET /admin/analytics`)
	- Backup and restore (`GET /admin/backup`, `POST /admin/restore`)
- API startup auto-applies `sql/patch-core.sql` and `sql/patch-auth.sql` to keep local schema current.
- Default admin bootstrap credentials are controlled by `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`.
