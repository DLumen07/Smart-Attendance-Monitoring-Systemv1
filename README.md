# Smart Attendance Monitoring

A simple attendance monitoring system with a React + Tailwind frontend on port 5000 and a PHP/MySQL backend on XAMPP Apache port 80.

## Project Structure

- `frontend/` - React app for instructors and students.
- `backend/api/` - PHP JSON API.
- `database/schema.sql` - MySQL schema.

## Features

- Instructor and Student roles
- Login/register with JWT auth
- Instructor class creation and session management
- QR/code/manual attendance check-in
- Instructor review of pending attendance
- Student attendance history
- Password reset via email (PHPMailer)

## Setup

1. Import `database/schema.sql` into MySQL.
2. Configure Apache/XAMPP so `backend/api` is reachable at `http://localhost/Smart%20Attendance%20Monitoring/backend/api` and ensure `mod_rewrite` + `.htaccess` overrides are enabled for API routing.
3. (Optional) Configure SMS alerts by creating `backend/api/.env` with:
   ```bash
   ATTENDANCE_SMS_ENABLED=true
   TWILIO_SID=your_sid
   TWILIO_TOKEN=your_token
   TWILIO_FROM=your_twilio_number
   ```
4. (Optional) Configure email delivery for password reset and alerts by adding to `backend/api/.env`:
   ```bash
   ATTENDANCE_EMAIL_ENABLED=true
   ATTENDANCE_MAIL_FROM=noreply@smart-attendance.local
   ATTENDANCE_MAIL_FROM_NAME=Smart Attendance Monitoring
   ATTENDANCE_SMTP_HOST=smtp.gmail.com
   ATTENDANCE_SMTP_PORT=587
   ATTENDANCE_SMTP_USER=your_email@gmail.com
   ATTENDANCE_SMTP_PASS=your_app_password
   ATTENDANCE_SMTP_SECURE=tls
   ```
5. If your database already exists, add password reset columns:
   ```sql
   ALTER TABLE users
     ADD COLUMN reset_code VARCHAR(12) NULL,
     ADD COLUMN reset_code_expires_at DATETIME NULL;
   ```
6. In `frontend/`, copy `.env.example` to `.env` if needed.
7. Install frontend dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```

## Hosting Notes (InfinityFree)

- Set database credentials in `backend/api/.env` using `DB_HOST`, `DB_NAME`, `DB_USER`, and `DB_PASS`.
- Set `VITE_API_BASE_URL` in `frontend/.env` to your live API URL (e.g., `https://yourdomain/api`).
- Ensure `frontend/public/.htaccess` is uploaded to the web root so SPA routes resolve.

## Sample Instructor Account

If you want a ready-to-use instructor account, open this in the browser while XAMPP is running:

`http://localhost/Smart%20Attendance%20Monitoring/backend/api/dev-seed.php`

Credentials created:

- Email: instructor@demo.local
- Password: Instructor123!
- Role: instructor

## Notes

- Frontend runs on port 5000.
- Backend runs through XAMPP Apache on port 80.
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
- Added email-based password reset flow powered by PHPMailer.
- Attendance alert emails now use a branded template via PHPMailer.
- Consecutive absence alerts fire whenever the last three sessions are absent.
- Instructor QR codes can be downloaded as PNG/JPG while student session codes remain hidden.
- Instructor dashboard Agenda card now uses class schedules for today.
- Registration now enforces strict full-name and email validation to prevent duplicate accounts.
- Full-name duplicates are blocked globally during registration.
