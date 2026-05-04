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

## Setup

1. Import `database/schema.sql` into MySQL.
2. Configure Apache/XAMPP so `backend/api` is reachable at `http://localhost/Smart%20Attendance%20Monitoring/backend/api` and ensure `mod_rewrite` + `.htaccess` overrides are enabled for API routing.
3. In `frontend/`, copy `.env.example` to `.env` if needed.
4. Install frontend dependencies and run the dev server:
   ```bash
   npm install
   npm run dev
   ```

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
