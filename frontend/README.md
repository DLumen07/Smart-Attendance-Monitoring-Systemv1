# Smart Attendance Monitoring Frontend

React + Tailwind app for instructors and students.

## Run

1. Copy `.env.example` to `.env` if you want to override the API URL.
2. Install dependencies and start the app on port 5000:
	```bash
	npm install
	npm run dev
	```
3. Backend API should run on Apache/XAMPP at `http://localhost/Smart%20Attendance%20Monitoring/backend/api`.

## Roles

- Instructor: create classes, create sessions, review attendance.
- Student: join classes, check in with QR/code/manual, view attendance history.
