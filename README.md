# Smart Attendance Monitoring

A simple attendance monitoring system with a React + Tailwind frontend on port 5000 and a Node.js/Express API backed by PostgreSQL on port 3001.

## Project Structure

- `frontend/` - React app for instructors and students.
- `backend/node-api/` - Node.js API.

## Features

- Instructor and Student roles
- Admin role with instructor approval workflow
- Login/register with JWT auth and rate limiting
- **Proper session handling**: Only one user can be authenticated per browser (shared across tabs); attempting to login/register a different account requires logging out first
- Register module with split name fields (first, middle, last)
- Student registration captures year level, program/department, section, and student ID
- Strong password requirements: 10+ characters with uppercase, lowercase, number, and symbol
- Comprehensive input sanitization: control character stripping, whitespace normalization
- Email validation requiring at least one letter (prevents numeric-only addresses)
- Register input validation for names, email, and password
- Password confirmation and password visibility toggles on registration
- Rate limiting on auth endpoints (5 register attempts, 10 login attempts, 5 password-reset per 15 minutes)
- Admin activity logs, platform analytics, and backup/restore controls
- Instructor class creation and session management
- QR/code/manual attendance check-in
- Instructor review of pending attendance
- Student attendance history
- Password reset via email (SMTP)
- User settings page for name, email, and password updates

## Setup

1. Start Postgres (Docker):
   ```bash
   cd backend/node-api
   docker compose up -d
   ```
2. Copy `backend/node-api/.env.example` to `backend/node-api/.env` and set `DATABASE_URL` to:
   ```
   postgresql://postgres:password@localhost:5432/smart_attendance
   ```
   If you see `ECONNREFUSED ::1`, use `127.0.0.1` instead of `localhost`.
3. Install backend dependencies and run the API:
   ```bash
   npm install
   npm run dev
   ```
4. Install frontend dependencies and run the dev server:
   ```bash
   cd ../../frontend
   npm install
   npm run dev
   ```
5. Optional checks:
   ```bash
   npm --prefix backend/node-api run db:check
   npm --prefix backend/node-api run seed:demo
   npm --prefix backend/node-api run smoke:auth
   npm --prefix backend/node-api run smoke:reset
   npm --prefix backend/node-api run smoke:classes
   ```
   Forgot-password needs SMTP configured (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) or it returns 503.
   Attendance alerts (3 consecutive absences) require `ATTENDANCE_EMAIL_ENABLED=true`, SMTP config, and parent emails on student records.
   If you created the DB before adding class/session tables, run `backend/node-api/sql/patch-core.sql` and `backend/node-api/sql/patch-auth.sql` once.

## Hosting Notes

- Set `DATABASE_URL` and SMTP settings in `backend/node-api/.env` on your host.
- Set `VITE_API_BASE_URL` in `frontend/.env` to your live API URL (for example, `https://api.example.com`).
- Ensure your host supports SPA routing (rewrite all routes to `index.html`).

## Free Demo Deployment (Recommended)

This is the easiest free setup for a capstone demo: **Vercel (frontend) + Render (API) + Neon/Supabase (Postgres)**.

### 1) Database (Neon or Supabase)

- Create a Postgres database.
- Copy the connection string for later (used as `DATABASE_URL`).

### 2) Backend (Render)

- Create a new **Web Service** from this repo.
- Root directory: `backend/node-api`
- Build command: `npm install`
- Start command: `npm run start`
- Environment variables:
   - `DATABASE_URL` = your Neon/Supabase connection string
   - `JWT_SECRET` = a strong secret
   - `CORS_ORIGINS` = your frontend URL (from Vercel)
   - `MAIL_ENABLED` = `true` or `false`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE` (only if email is needed)

Render’s free tier sleeps after inactivity, so the first request can be slow.

### 3) Frontend (Vercel)

- Import the same repo into Vercel.
- If you deploy from the repo root, `vercel.json` will build the frontend and add SPA rewrites (no extra settings needed).
- If you prefer manual settings, use:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
- Environment variable:
   - `VITE_API_BASE_URL` = your Render API URL (for example, `https://your-api.onrender.com`)

That’s it. Open the Vercel URL to access the demo.

## Notes

- Frontend runs on port 5000.
- Node API runs on port 3001 for `/auth`, `/student`, and `/instructor` routes.
- Admin features are exposed via `/admin` routes (admin role only).
- Postgres runs on port 5432 and seeds from `backend/node-api/sql/schema.sql` on first start.
- Manual self-attendance is supported for open sessions.

## UI Progress

- Instructor dashboard rebuilt into a command-center layout with a new hero, stats strip, and action dock.
- Course workspace redesigned with a live session stage, bento-style metrics, and a new attendance ledger.
- Roster view now uses a card grid with join-code controls and refreshed empty states.
- Instructor class page now features live session controls, live tracking, roster visibility, invite links, and session history export.
- Upgraded the Instructor Class View to a modern Bento-grid layout to align perfectly with the dashboard aesthetic, complete with dynamic live-tracking cards and interactive hero structure.
- Historical data export now supports PDF output with on-card filters.
- Live tracking now marks late check-ins after 5 minutes and sessions remain open until the instructor ends them.
- Student dashboard attendance overview now charts sessions using session start times and attended counts, with overall rate based on attended vs total.
- Student dashboard attendance overview redesigned with stacked bars and a clearer overall rate progress bar.
- Late check-ins are computed using database time to avoid timezone mismatches.
- Student class detail active session area redesigned into bento-style cards for code check-in, status, and QR scanning.
- Student attendance performance card upgraded with overall + recent analytics and mini breakdown bars.
- Added email-based password reset flow with SMTP.
- Attendance alert emails now use a branded template via SMTP.
- Consecutive absence alerts fire whenever the last three sessions are absent.
- Instructor QR codes can be downloaded as PNG/JPG while student session codes remain hidden.
- Instructor dashboard Agenda card now uses class schedules for today.
- Registration now enforces strict name-part and email validation to prevent duplicate accounts.
- Full-name duplicates are blocked globally during registration.
- Registration now supports firstName, middleName, and lastName inputs (with legacy fullName fallback for compatibility).
- Registration requires matching password and confirm password when confirm password is supplied.
- Instructor registrations are now created as pending and require admin approval before login.
- Added admin dashboard module for instructor approvals, activity logs, analytics, and backup/restore.
