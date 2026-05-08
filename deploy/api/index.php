<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailerException;

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

header('Content-Type: application/json');

function loadEnvFile(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0]);
        $value = trim($parts[1]);
        if ($key === '') {
            continue;
        }

        $value = trim($value, " \"'");
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

loadEnvFile(__DIR__ . '/.env');

$allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'http://smartattendancemonitoring.free.nf',
    'https://smartattendancemonitoring.free.nf',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = [
    'db_host' => getenv('DB_HOST') ?: '127.0.0.1',
    'db_name' => getenv('DB_NAME') ?: 'smart_attendance',
    'db_user' => getenv('DB_USER') ?: 'root',
    'db_pass' => getenv('DB_PASS') ?: '',
    'jwt_secret' => 'replace-this-in-production',
    'notify_email_enabled' => getenv('ATTENDANCE_EMAIL_ENABLED') === 'true',
    'notify_sms_enabled' => getenv('ATTENDANCE_SMS_ENABLED') === 'true',
    'mail_from' => getenv('ATTENDANCE_MAIL_FROM') ?: 'noreply@smart-attendance.local',
    'mail_from_name' => getenv('ATTENDANCE_MAIL_FROM_NAME') ?: 'Smart Attendance Monitoring',
    'mail_reply_to' => getenv('ATTENDANCE_MAIL_REPLY_TO') ?: '',
    'smtp_host' => getenv('ATTENDANCE_SMTP_HOST') ?: '',
    'smtp_port' => (int) (getenv('ATTENDANCE_SMTP_PORT') ?: 587),
    'smtp_user' => getenv('ATTENDANCE_SMTP_USER') ?: '',
    'smtp_pass' => getenv('ATTENDANCE_SMTP_PASS') ?: '',
    'smtp_secure' => strtolower(getenv('ATTENDANCE_SMTP_SECURE') ?: 'tls'),
    'twilio_sid' => getenv('TWILIO_SID') ?: '',
    'twilio_token' => getenv('TWILIO_TOKEN') ?: '',
    'twilio_from' => getenv('TWILIO_FROM') ?: '',
];

$lateCutoffMinutes = 5;

try {
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Throwable $error) {
    respond(500, ['message' => 'Database connection failed', 'error' => $error->getMessage()]);
}

$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$scriptDir = urldecode($scriptDir);
$requestPath = urldecode($requestPath);
$path = '/' . ltrim(substr($requestPath, strlen($scriptDir)), '/');
$path = preg_replace('#^/index\.php#', '', $path) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input') ?: '{}', true) ?: [];

if ($path === '/health' && $method === 'GET') {
    respond(200, ['status' => 'ok']);
}

if ($path === '/auth/register' && $method === 'POST') {
    $fullName = normalizeName((string) ($input['fullName'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $role = strtolower(trim((string) ($input['role'] ?? '')));
    $parentName = normalizeName((string) ($input['parentName'] ?? ''));
    $parentEmail = strtolower(trim((string) ($input['parentEmail'] ?? '')));
    $parentPhone = trim((string) ($input['parentPhone'] ?? ''));

    if ($fullName === '' || $email === '' || $password === '' || !in_array($role, ['instructor', 'student'], true)) {
        respond(422, ['message' => 'Invalid registration payload']);
    }

    if (!isValidFullName($fullName, true)) {
        respond(422, ['message' => 'Full name must include at least first and last name and only letters, spaces, apostrophes, or hyphens.']);
    }

    if (!isValidEmailAddress($email)) {
        respond(422, ['message' => 'Invalid email address.']);
    }

    if (strlen($password) < 8) {
        respond(422, ['message' => 'Password must be at least 8 characters.']);
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        respond(409, ['message' => 'Email already registered']);
    }

    $nameStmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(full_name) = LOWER(:full_name)');
    $nameStmt->execute(['full_name' => $fullName]);
    if ($nameStmt->fetch()) {
        respond(409, ['message' => 'Full name already registered']);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    if ($role !== 'student') {
        $parentName = '';
        $parentEmail = '';
        $parentPhone = '';
    }
    if ($parentName !== '' && !isValidFullName($parentName, true)) {
        respond(422, ['message' => 'Parent name must include first and last name and only letters, spaces, apostrophes, or hyphens.']);
    }
    if ($parentEmail !== '' && !isValidEmailAddress($parentEmail)) {
        respond(422, ['message' => 'Parent email address is invalid.']);
    }
    $insert = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, parent_name, parent_email, parent_phone) VALUES (:full_name, :email, :password_hash, :role, :parent_name, :parent_email, :parent_phone)');
    $insert->execute([
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => $passwordHash,
        'role' => $role,
        'parent_name' => $parentName !== '' ? $parentName : null,
        'parent_email' => $parentEmail !== '' ? $parentEmail : null,
        'parent_phone' => $parentPhone !== '' ? $parentPhone : null,
    ]);

    $userId = (int) $pdo->lastInsertId();
    $token = makeJwt(['sub' => $userId, 'role' => $role, 'email' => $email], $config['jwt_secret']);

    respond(201, ['token' => $token, 'user' => ['id' => $userId, 'fullName' => $fullName, 'email' => $email, 'role' => $role]]);
}

if ($path === '/auth/login' && $method === 'POST') {
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');

    if ($email === '' || $password === '') {
        respond(422, ['message' => 'Email and password are required']);
    }

    $stmt = $pdo->prepare('SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(401, ['message' => 'Invalid credentials']);
    }

    $token = makeJwt(['sub' => (int) $user['id'], 'role' => $user['role'], 'email' => $user['email']], $config['jwt_secret']);
    respond(200, [
        'token' => $token,
        'user' => [
            'id' => (int) $user['id'],
            'fullName' => $user['full_name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ],
    ]);
}

if ($path === '/auth/forgot-password' && $method === 'POST') {
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    if ($email === '') {
        respond(422, ['message' => 'Email is required']);
    }

    if (!$config['notify_email_enabled'] || !isEmailConfigured($config)) {
        respond(503, ['message' => 'Email delivery is not configured']);
    }

    $stmt = $pdo->prepare('SELECT id, full_name FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $userRow = $stmt->fetch();

    $shouldSend = false;
    $subject = '';
    $htmlBody = '';
    $textBody = '';

    if ($userRow) {
        $code = (string) random_int(100000, 999999);
        $update = $pdo->prepare('UPDATE users SET reset_code = :code, reset_code_expires_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id = :id');
        $update->execute([
            'code' => $code,
            'id' => $userRow['id'],
        ]);

        $displayName = $userRow['full_name'] ?? 'Student';
        $subject = 'Your Smart Attendance reset code';
        $htmlBody = buildResetEmail($displayName, $code);
        $textBody = "Your Smart Attendance reset code is $code. This code expires in 15 minutes.";
        $shouldSend = true;
    }

    respondAndContinue(200, ['message' => 'If an account exists for this email, a reset code has been sent.']);

    if ($shouldSend) {
        $errorMessage = null;
        $sent = sendEmailMessage($config, $email, $subject, $htmlBody, $textBody, $errorMessage);
        if (!$sent) {
            error_log('Reset email failed: ' . ($errorMessage ?: 'unknown error'));
        }
    }
    exit;
}

if ($path === '/auth/reset-password' && $method === 'POST') {
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $code = trim((string) ($input['code'] ?? ''));
    $password = (string) ($input['password'] ?? '');

    if ($email === '' || $code === '' || $password === '') {
        respond(422, ['message' => 'Email, code, and password are required']);
    }

    $code = preg_replace('/\D+/', '', $code);
    if (strlen($code) !== 6) {
        respond(422, ['message' => 'Reset code must be 6 digits']);
    }

    if (strlen($password) < 8) {
        respond(422, ['message' => 'Password must be at least 8 characters']);
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email AND reset_code = :code AND reset_code_expires_at > NOW()');
    $stmt->execute(['email' => $email, 'code' => $code]);
    $userRow = $stmt->fetch();
    if (!$userRow) {
        respond(422, ['message' => 'Invalid or expired reset code']);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $update = $pdo->prepare('UPDATE users SET password_hash = :password_hash, reset_code = NULL, reset_code_expires_at = NULL WHERE id = :id');
    $update->execute([
        'password_hash' => $passwordHash,
        'id' => $userRow['id'],
    ]);

    respond(200, ['message' => 'Password updated successfully']);
}

$user = requireAuth($config['jwt_secret']);

if ($path === '/instructor/classes' && $method === 'GET') {
    ensureRole($user, 'instructor');
    $stmt = $pdo->prepare('SELECT c.id, c.name, c.join_code AS joinCode, c.created_at AS createdAt, COUNT(DISTINCT m.student_id) as studentCount FROM classes c LEFT JOIN class_members m ON c.id = m.class_id WHERE c.instructor_id = :instructor_id GROUP BY c.id ORDER BY c.id DESC');
    $stmt->execute(['instructor_id' => $user['id']]);
    $classes = $stmt->fetchAll();
    
    if (count($classes) > 0) {
        $classIds = array_column($classes, 'id');
        $placeholders = implode(',', array_fill(0, count($classIds), '?'));
        $schedStmt = $pdo->prepare("SELECT class_id, day_of_week as dayOfWeek, start_time as startTime, end_time as endTime FROM class_schedules WHERE class_id IN ($placeholders)");
        $schedStmt->execute($classIds);
        $schedules = $schedStmt->fetchAll();
        
        $schedMap = [];
        foreach ($schedules as $sched) {
            $schedMap[$sched['class_id']][] = $sched;
        }
        
        foreach ($classes as &$class) {
            $class['schedules'] = $schedMap[$class['id']] ?? [];
        }
    }

    respond(200, ['classes' => $classes]);
}

if ($path === '/instructor/analytics' && $method === 'GET') {
    ensureRole($user, 'instructor');

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM classes WHERE instructor_id = :instructor_id');
    $stmt->execute(['instructor_id' => $user['id']]);
    $totalClasses = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM sessions s JOIN classes c ON c.id = s.class_id WHERE c.instructor_id = :instructor_id');
    $stmt->execute(['instructor_id' => $user['id']]);
    $totalSessions = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare('SELECT COUNT(DISTINCT m.student_id) FROM class_members m JOIN classes c ON c.id = m.class_id WHERE c.instructor_id = :instructor_id');
    $stmt->execute(['instructor_id' => $user['id']]);
    $totalStudents = (int) $stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS present_count, COUNT(*) AS total_count FROM attendance a JOIN sessions s ON s.id = a.session_id JOIN classes c ON c.id = s.class_id WHERE c.instructor_id = :instructor_id");
    $stmt->execute(['instructor_id' => $user['id']]);
    $attendanceRow = $stmt->fetch();
    $presentCount = (int) ($attendanceRow['present_count'] ?? 0);
    $totalCount = (int) ($attendanceRow['total_count'] ?? 0);
    $attendanceRate = $totalCount ? (int) round(($presentCount / $totalCount) * 100) : 0;

    $stmt = $pdo->prepare('
        SELECT s.id, s.session_name as sessionName, s.starts_at as startsAt, s.status, c.name as className,
        (SELECT COUNT(*) FROM attendance a WHERE a.session_id = s.id AND a.status IN ("present", "late")) as attendances
        FROM sessions s
        JOIN classes c ON c.id = s.class_id
        WHERE c.instructor_id = :instructor_id
        ORDER BY s.starts_at DESC LIMIT 3
    ');
    $stmt->execute(['instructor_id' => $user['id']]);
    $recentSessions = $stmt->fetchAll();

    respond(200, [
        'analytics' => [
            'totalClasses' => $totalClasses,
            'totalStudents' => $totalStudents,
            'totalSessions' => $totalSessions,
            'attendanceRate' => $attendanceRate,
            'recentSessions' => $recentSessions,
        ],
    ]);
}

if ($path === '/instructor/classes' && $method === 'POST') {
    ensureRole($user, 'instructor');
    $name = trim((string) ($input['name'] ?? ''));
    $schedules = $input['schedules'] ?? [];

    if ($name === '') {
        respond(422, ['message' => 'Class name is required']);
    }

    $joinCode = makeCode(8);
    
    $pdo->beginTransaction();
    try {
        $insert = $pdo->prepare('INSERT INTO classes (instructor_id, name, join_code) VALUES (:instructor_id, :name, :join_code)');
        $insert->execute([
            'instructor_id' => $user['id'],
            'name' => $name,
            'join_code' => $joinCode,
        ]);
        
        $classId = (int) $pdo->lastInsertId();

        if (is_array($schedules) && count($schedules) > 0) {
            $schedStmt = $pdo->prepare('INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES (:class_id, :day_of_week, :start_time, :end_time)');
            foreach ($schedules as $sched) {
                // Ignore empty scheduled rows if somehow passed
                if (empty($sched['dayOfWeek']) || empty($sched['startTime']) || empty($sched['endTime'])) {
                    continue;
                }
                $schedStmt->execute([
                    'class_id' => $classId,
                    'day_of_week' => trim((string) $sched['dayOfWeek']),
                    'start_time' => trim((string) $sched['startTime']),
                    'end_time' => trim((string) $sched['endTime'])
                ]);
            }
        }
        $pdo->commit();

        respond(201, [
            'class' => [
                'id' => $classId,
                'name' => $name,
                'joinCode' => $joinCode,
            ],
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(500, ['message' => 'Failed to create class', 'error' => $e->getMessage()]);
    }
}

if (preg_match('#^/instructor/classes/(\d+)$#', $path, $matches) && $method === 'PUT') {
    ensureRole($user, 'instructor');
    $classId = (int) $matches[1];
    assertInstructorOwnsClass($pdo, $classId, $user['id']);

    $name = trim((string) ($input['name'] ?? ''));
    $schedules = $input['schedules'] ?? [];

    if ($name === '') {
        respond(422, ['message' => 'Class name is required']);
    }

    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare('UPDATE classes SET name = :name WHERE id = :id');
        $update->execute(['name' => $name, 'id' => $classId]);

        // Replace all schedules
        $delStmt = $pdo->prepare('DELETE FROM class_schedules WHERE class_id = :class_id');
        $delStmt->execute(['class_id' => $classId]);

        if (is_array($schedules) && count($schedules) > 0) {
            $schedStmt = $pdo->prepare('INSERT INTO class_schedules (class_id, day_of_week, start_time, end_time) VALUES (:class_id, :day_of_week, :start_time, :end_time)');
            foreach ($schedules as $sched) {
                if (empty($sched['dayOfWeek']) || empty($sched['startTime']) || empty($sched['endTime'])) {
                    continue;
                }
                $schedStmt->execute([
                    'class_id' => $classId,
                    'day_of_week' => trim((string) $sched['dayOfWeek']),
                    'start_time' => trim((string) $sched['startTime']),
                    'end_time' => trim((string) $sched['endTime'])
                ]);
            }
        }
        $pdo->commit();

        respond(200, ['message' => 'Class updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(500, ['message' => 'Failed to update class', 'error' => $e->getMessage()]);
    }
}

if (preg_match('#^/instructor/classes/(\d+)/sessions$#', $path, $matches) && $method === 'POST') {
    ensureRole($user, 'instructor');
    $classId = (int) $matches[1];
    assertInstructorOwnsClass($pdo, $classId, $user['id']);

    $sessionName = trim((string) ($input['sessionName'] ?? ''));
    $mode = (string) ($input['attendanceMode'] ?? 'qr_or_code');
    if ($sessionName === '') {
        respond(422, ['message' => 'Session name is required']);
    }
    if (!in_array($mode, ['qr_or_code', 'manual_only'], true)) {
        respond(422, ['message' => 'Invalid attendance mode']);
    }

    $sessionCode = makeCode(6);
    $stmt = $pdo->prepare('INSERT INTO sessions (class_id, session_name, session_code, attendance_mode, status, starts_at) VALUES (:class_id, :session_name, :session_code, :mode, "open", NOW())');
    $stmt->execute([
        'class_id' => $classId,
        'session_name' => $sessionName,
        'session_code' => $sessionCode,
        'mode' => $mode,
    ]);
    
    $sessionId = (int) $pdo->lastInsertId();

    // Auto-create absent attendance records for all enrolled students
    $enrolledStmt = $pdo->prepare('SELECT student_id FROM class_members WHERE class_id = :class_id');
    $enrolledStmt->execute(['class_id' => $classId]);
    $students = $enrolledStmt->fetchAll(PDO::FETCH_COLUMN);

    if (!empty($students)) {
        $insertVals = [];
        $params = [];
        foreach ($students as $i => $stuId) {
            $insertVals[] = "(:session_id_$i, :student_id_$i, 'manual', 'absent')";
            $params["session_id_$i"] = $sessionId;
            $params["student_id_$i"] = $stuId;
        }
        $bulkInsert = 'INSERT INTO attendance (session_id, student_id, method, status) VALUES ' . implode(', ', $insertVals);
        $bulkStmt = $pdo->prepare($bulkInsert);
        $bulkStmt->execute($params);
    }

    respond(201, [
        'session' => [
            'id' => $sessionId,
            'classId' => $classId,
            'sessionName' => $sessionName,
            'sessionCode' => $sessionCode,
            'attendanceMode' => $mode,
            'status' => 'open',
        ],
    ]);
}

if (preg_match('#^/instructor/classes/(\d+)/sessions$#', $path, $matches) && $method === 'GET') {
    ensureRole($user, 'instructor');
    $classId = (int) $matches[1];
    assertInstructorOwnsClass($pdo, $classId, $user['id']);

    $stmt = $pdo->prepare('SELECT id, class_id AS classId, session_name AS sessionName, session_code AS sessionCode, attendance_mode AS attendanceMode, status, starts_at AS startsAt, ends_at AS endsAt FROM sessions WHERE class_id = :class_id ORDER BY id DESC');
    $stmt->execute(['class_id' => $classId]);
    respond(200, ['sessions' => $stmt->fetchAll()]);
}

if (preg_match('#^/instructor/classes/(\d+)/students$#', $path, $matches) && $method === 'GET') {
    ensureRole($user, 'instructor');
    $classId = (int) $matches[1];
    assertInstructorOwnsClass($pdo, $classId, $user['id']);

    $stmt = $pdo->prepare('
        SELECT u.id, u.full_name AS fullName, u.email, cm.joined_at AS joinedAt
        FROM class_members cm
        JOIN users u ON u.id = cm.student_id
        WHERE cm.class_id = :class_id
        ORDER BY u.full_name ASC
    ');
    $stmt->execute(['class_id' => $classId]);
    respond(200, ['students' => $stmt->fetchAll()]);
}

if (preg_match('#^/instructor/sessions/(\d+)/status$#', $path, $matches) && $method === 'PATCH') {
    ensureRole($user, 'instructor');
    $sessionId = (int) $matches[1];
    $status = (string) ($input['status'] ?? '');
    if (!in_array($status, ['open', 'closed'], true)) {
        respond(422, ['message' => 'Invalid status']);
    }

    assertInstructorOwnsSession($pdo, $sessionId, $user['id']);
    $stmt = $pdo->prepare('UPDATE sessions SET status = :status, ends_at = CASE WHEN :status = "closed" THEN NOW() ELSE NULL END WHERE id = :session_id');
    $stmt->execute(['status' => $status, 'session_id' => $sessionId]);

    if ($status === 'closed') {
        $sessionInfoStmt = $pdo->prepare('SELECT class_id AS classId, session_name AS sessionName, starts_at AS startsAt FROM sessions WHERE id = :session_id');
        $sessionInfoStmt->execute(['session_id' => $sessionId]);
        $sessionInfo = $sessionInfoStmt->fetch();

        respondAndContinue(200, ['message' => 'Session updated']);

        if ($sessionInfo) {
            handleConsecutiveAbsenceAlerts($pdo, $config, (int) $sessionInfo['classId'], $sessionId, $sessionInfo);
        }
        exit;
    }

    respond(200, ['message' => 'Session updated']);
}

if (preg_match('#^/instructor/sessions/(\d+)/attendance$#', $path, $matches) && $method === 'GET') {
    ensureRole($user, 'instructor');
    $sessionId = (int) $matches[1];
    assertInstructorOwnsSession($pdo, $sessionId, $user['id']);

    // Ensure all enrolled students have an attendance record for this session
    $sessionStmt = $pdo->prepare('SELECT class_id FROM sessions WHERE id = :session_id');
    $sessionStmt->execute(['session_id' => $sessionId]);
    $sessionRecord = $sessionStmt->fetch();
    if ($sessionRecord) {
        $insertMissing = 'INSERT IGNORE INTO attendance (session_id, student_id, method, status)
                          SELECT :session_id, student_id, "manual", "absent"
                          FROM class_members WHERE class_id = :class_id';
        $pdo->prepare($insertMissing)->execute([
            'session_id' => $sessionId,
            'class_id' => $sessionRecord['class_id']
        ]);
    }

    $sql = 'SELECT a.id, a.method, a.status, a.checked_in_at AS checkedInAt, u.full_name AS studentName, u.email AS studentEmail
            FROM attendance a
            JOIN users u ON u.id = a.student_id
            WHERE a.session_id = :session_id
            ORDER BY u.full_name ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['session_id' => $sessionId]);
    respond(200, ['attendance' => $stmt->fetchAll()]);
}

if (preg_match('#^/instructor/attendance/(\d+)$#', $path, $matches) && $method === 'PATCH') {
    ensureRole($user, 'instructor');
    $attendanceId = (int) $matches[1];
    $status = (string) ($input['status'] ?? '');
    if (!in_array($status, ['present', 'late', 'absent'], true)) {
        respond(422, ['message' => 'Status must be present, late, or absent']);
    }

    $sessionIdStmt = $pdo->prepare('SELECT a.session_id FROM attendance a WHERE a.id = :attendance_id');
    $sessionIdStmt->execute(['attendance_id' => $attendanceId]);
    $attendanceRow = $sessionIdStmt->fetch();
    if (!$attendanceRow) {
        respond(404, ['message' => 'Attendance not found']);
    }

    assertInstructorOwnsSession($pdo, (int) $attendanceRow['session_id'], $user['id']);

    $stmt = $pdo->prepare('UPDATE attendance SET status = :status, reviewed_at = NOW(), reviewed_by = :reviewed_by WHERE id = :attendance_id');
    $stmt->execute([
        'status' => $status,
        'reviewed_by' => $user['id'],
        'attendance_id' => $attendanceId,
    ]);

    respond(200, ['message' => 'Attendance reviewed']);
}

if ($path === '/student/classes/join' && $method === 'POST') {
    ensureRole($user, 'student');
    $joinCode = strtoupper(trim((string) ($input['joinCode'] ?? '')));
    if ($joinCode === '') {
        respond(422, ['message' => 'Join code is required']);
    }

    $classStmt = $pdo->prepare('SELECT id FROM classes WHERE join_code = :join_code');
    $classStmt->execute(['join_code' => $joinCode]);
    $class = $classStmt->fetch();
    if (!$class) {
        respond(404, ['message' => 'Class not found']);
    }

    $stmt = $pdo->prepare('INSERT IGNORE INTO class_members (class_id, student_id) VALUES (:class_id, :student_id)');
    $stmt->execute(['class_id' => $class['id'], 'student_id' => $user['id']]);

    respond(200, ['message' => 'Joined class successfully']);
}

if ($path === '/student/classes' && $method === 'GET') {
    ensureRole($user, 'student');
    $sql = 'SELECT c.id, c.name, c.join_code AS joinCode, u.full_name AS instructorName
            FROM class_members m
            JOIN classes c ON c.id = m.class_id
            JOIN users u ON u.id = c.instructor_id
            WHERE m.student_id = :student_id
            ORDER BY c.id DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['student_id' => $user['id']]);
    respond(200, ['classes' => $stmt->fetchAll()]);
}

if (preg_match('#^/student/classes/(\d+)$#', $path, $matches) && $method === 'GET') {
    ensureRole($user, 'student');
    $classId = (int) $matches[1];
    $class = assertStudentEnrolledClass($pdo, $classId, $user['id']);

    $schedStmt = $pdo->prepare('SELECT day_of_week AS dayOfWeek, start_time AS startTime, end_time AS endTime FROM class_schedules WHERE class_id = :class_id ORDER BY id ASC');
    $schedStmt->execute(['class_id' => $classId]);
    $class['schedules'] = $schedStmt->fetchAll();

    respond(200, ['class' => $class]);
}

if (preg_match('#^/student/classes/(\d+)/sessions$#', $path, $matches) && $method === 'GET') {
    ensureRole($user, 'student');
    $classId = (int) $matches[1];
    $class = assertStudentEnrolledClass($pdo, $classId, $user['id']);

    $sql = 'SELECT s.id, s.session_name AS sessionName, s.session_code AS sessionCode, s.attendance_mode AS attendanceMode,
                   s.status, s.starts_at AS startsAt, s.ends_at AS endsAt,
                   a.status AS attendanceStatus, a.method AS attendanceMethod, a.checked_in_at AS checkedInAt
            FROM sessions s
            LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = :student_id
            WHERE s.class_id = :class_id
            ORDER BY s.id DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['class_id' => $classId, 'student_id' => $user['id']]);
    $sessions = $stmt->fetchAll();

    foreach ($sessions as &$session) {
        $session['sessionCode'] = null;
    }
    unset($session);

    respond(200, ['class' => $class, 'sessions' => $sessions]);
}

if ($path === '/student/checkins' && $method === 'POST') {
    ensureRole($user, 'student');
    $sessionCode = strtoupper(trim((string) ($input['sessionCode'] ?? '')));
    $methodName = (string) ($input['method'] ?? 'code');

    if (!in_array($methodName, ['qr', 'code', 'manual'], true)) {
        respond(422, ['message' => 'Invalid check-in method']);
    }

    if ($sessionCode === '' && $methodName !== 'manual') {
        respond(422, ['message' => 'Session code is required']);
    }

    if ($methodName === 'manual') {
        $classId = (int) ($input['classId'] ?? 0);
        if ($classId <= 0) {
            respond(422, ['message' => 'Class is required for manual check-in']);
        }

        $sessionStmt = $pdo->prepare('SELECT s.id, s.class_id AS classId, s.attendance_mode, s.starts_at AS startsAt, TIMESTAMPDIFF(MINUTE, s.starts_at, NOW()) AS minutesSinceStart FROM sessions s WHERE s.class_id = :class_id AND s.status = "open" ORDER BY s.id DESC LIMIT 1');
        $sessionStmt->execute(['class_id' => $classId]);
        $session = $sessionStmt->fetch();
        if (!$session) {
            respond(404, ['message' => 'No open session found for class']);
        }
    } else {
        $sessionStmt = $pdo->prepare('SELECT s.id, s.class_id AS classId, s.attendance_mode, s.starts_at AS startsAt, TIMESTAMPDIFF(MINUTE, s.starts_at, NOW()) AS minutesSinceStart FROM sessions s WHERE s.session_code = :session_code AND s.status = "open"');
        $sessionStmt->execute(['session_code' => $sessionCode]);
        $session = $sessionStmt->fetch();
        if (!$session) {
            respond(404, ['message' => 'Open session not found']);
        }
    }

    $memberStmt = $pdo->prepare('SELECT id FROM class_members WHERE class_id = :class_id AND student_id = :student_id');
    $memberStmt->execute(['class_id' => $session['classId'], 'student_id' => $user['id']]);
    if (!$memberStmt->fetch()) {
        respond(403, ['message' => 'You are not enrolled in this class']);
    }

    if ($methodName === 'manual' && $session['attendance_mode'] !== 'manual_only' && $session['attendance_mode'] !== 'qr_or_code') {
        respond(403, ['message' => 'Manual attendance is not allowed for this session']);
    }

    $status = 'present';
    if (isset($session['minutesSinceStart']) && $session['minutesSinceStart'] !== null) {
        $minutesSinceStart = (int) $session['minutesSinceStart'];
        if ($minutesSinceStart >= $lateCutoffMinutes) {
            $status = 'late';
        }
    } elseif (!empty($session['startsAt'])) {
        $startTime = new DateTime($session['startsAt']);
        $lateCutoff = clone $startTime;
        $lateCutoff->modify('+' . $lateCutoffMinutes . ' minutes');
        $now = new DateTime('now');
        if ($now >= $lateCutoff) {
            $status = 'late';
        }
    }

    $insert = $pdo->prepare('INSERT INTO attendance (session_id, student_id, method, status) VALUES (:session_id, :student_id, :method, :status) ON DUPLICATE KEY UPDATE method = VALUES(method), checked_in_at = NOW(), status = :status');
    $insert->execute([
        'session_id' => $session['id'],
        'student_id' => $user['id'],
        'method' => $methodName,
        'status' => $status,
    ]);

    respond(200, ['message' => $status === 'late' ? 'Late check-in recorded' : 'Check-in recorded', 'status' => $status]);
}

if ($path === '/student/attendance' && $method === 'GET') {
    ensureRole($user, 'student');
    $sql = 'SELECT a.id, c.name AS className, s.session_name AS sessionName, s.session_code AS sessionCode, s.starts_at AS startsAt, (DAYOFWEEK(s.starts_at) - 1) AS sessionDay, a.method, a.status, a.checked_in_at AS checkedInAt
            FROM attendance a
            JOIN sessions s ON s.id = a.session_id
            JOIN classes c ON c.id = s.class_id
            WHERE a.student_id = :student_id
            ORDER BY a.id DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['student_id' => $user['id']]);
    $records = $stmt->fetchAll();
    foreach ($records as &$record) {
        $record['sessionCode'] = null;
    }
    respond(200, ['attendance' => $records]);
}

respond(404, ['message' => 'Route not found']);

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function respondAndContinue(int $statusCode, array $payload): void
{
    ignore_user_abort(true);
    http_response_code($statusCode);
    echo json_encode($payload);

    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
        return;
    }

    if (function_exists('ob_get_level') && ob_get_level() > 0) {
        @ob_end_flush();
    }
    @flush();
}

function normalizeName(string $value): string
{
    $value = trim(preg_replace('/\s+/', ' ', $value));
    return $value;
}

function isValidFullName(string $value, bool $requireTwoParts = false): bool
{
    if ($value === '') {
        return false;
    }

    if (strlen($value) > 120) {
        return false;
    }

    if (!preg_match("/^[A-Za-z][A-Za-z'\- ]+$/", $value)) {
        return false;
    }

    if ($requireTwoParts) {
        $parts = array_values(array_filter(explode(' ', $value), 'strlen'));
        if (count($parts) < 2) {
            return false;
        }
    }

    return true;
}

function isValidEmailAddress(string $value): bool
{
    if ($value === '') {
        return false;
    }

    if (strlen($value) > 190) {
        return false;
    }

    return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
}

function makeCode(int $length): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $code;
}

function requireAuth(string $secret): array
{
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    // Fallback for Apache which might strip the Authorization header
    if (empty($authHeader) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    // Fallback for some CGI/FastCGI setups
    if (empty($authHeader)) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    }

    if (!preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        // Logging for debugging to help understand what headers came through
        error_log("Missing auth token. Headers received: " . print_r($_SERVER, true));
        respond(401, ['message' => 'Missing auth token']);
    }

    $payload = verifyJwt($matches[1], $secret);
    if (!$payload || !isset($payload['sub'], $payload['role'])) {
        respond(401, ['message' => 'Invalid auth token']);
    }

    return ['id' => (int) $payload['sub'], 'role' => (string) $payload['role']];
}

function ensureRole(array $user, string $requiredRole): void
{
    if ($user['role'] !== $requiredRole) {
        respond(403, ['message' => 'Forbidden']);
    }
}

function assertInstructorOwnsClass(PDO $pdo, int $classId, int $instructorId): void
{
    $stmt = $pdo->prepare('SELECT id FROM classes WHERE id = :class_id AND instructor_id = :instructor_id');
    $stmt->execute(['class_id' => $classId, 'instructor_id' => $instructorId]);
    if (!$stmt->fetch()) {
        respond(404, ['message' => 'Class not found']);
    }
}

function assertStudentEnrolledClass(PDO $pdo, int $classId, int $studentId): array
{
    $stmt = $pdo->prepare('SELECT c.id, c.name, c.join_code AS joinCode, u.full_name AS instructorName
                           FROM class_members m
                           JOIN classes c ON c.id = m.class_id
                           JOIN users u ON u.id = c.instructor_id
                           WHERE m.student_id = :student_id AND c.id = :class_id');
    $stmt->execute(['student_id' => $studentId, 'class_id' => $classId]);
    $class = $stmt->fetch();
    if (!$class) {
        respond(404, ['message' => 'Class not found']);
    }
    return $class;
}

function assertInstructorOwnsSession(PDO $pdo, int $sessionId, int $instructorId): void
{
    $sql = 'SELECT s.id
            FROM sessions s
            JOIN classes c ON c.id = s.class_id
            WHERE s.id = :session_id AND c.instructor_id = :instructor_id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['session_id' => $sessionId, 'instructor_id' => $instructorId]);
    if (!$stmt->fetch()) {
        respond(404, ['message' => 'Session not found']);
    }
}

function isEmailConfigured(array $config): bool
{
    return $config['smtp_host'] !== '' && $config['smtp_user'] !== '' && $config['smtp_pass'] !== '';
}

function sendEmailMessage(array $config, string $to, string $subject, string $htmlBody, ?string $textBody, ?string &$errorMessage = null): bool
{
    if (!isEmailConfigured($config)) {
        $errorMessage = 'Email delivery not configured';
        return false;
    }

    try {
        $mailer = new PHPMailer(true);
        $mailer->isSMTP();
        $mailer->Host = $config['smtp_host'];
        $mailer->SMTPAuth = true;
        $mailer->Username = $config['smtp_user'];
        $mailer->Password = $config['smtp_pass'];
        $mailer->Port = $config['smtp_port'];

        if ($config['smtp_secure'] === 'ssl') {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        } elseif ($config['smtp_secure'] === 'tls') {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mailer->SMTPSecure = false;
            $mailer->SMTPAutoTLS = false;
        }

        $mailer->setFrom($config['mail_from'], $config['mail_from_name']);
        if ($config['mail_reply_to'] !== '') {
            $mailer->addReplyTo($config['mail_reply_to']);
        }
        $mailer->addAddress($to);

        $mailer->isHTML(true);
        $mailer->Subject = $subject;
        $mailer->Body = $htmlBody;
        $mailer->AltBody = $textBody ?: trim(strip_tags($htmlBody));

        $mailer->send();
        return true;
    } catch (MailerException $e) {
        $errorMessage = $e->getMessage();
        return false;
    }
}

function buildResetEmail(string $name, string $code): string
{
    $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');

    return "<div style=\"font-family:Arial,sans-serif;background:#f8faf9;padding:24px;border-radius:16px\">"
        . "<h2 style=\"color:#18563e;margin:0 0 12px\">Password Reset Code</h2>"
        . "<p style=\"color:#334155;margin:0 0 12px\">Hi $safeName, use the code below to reset your password:</p>"
        . "<div style=\"font-size:28px;font-weight:700;letter-spacing:6px;color:#18563e;background:#eaf4ef;padding:12px 16px;border-radius:12px;display:inline-block\">$safeCode</div>"
        . "<p style=\"color:#64748b;margin:16px 0 0\">This code expires in 15 minutes.</p>"
        . "</div>";
}

function buildAttendanceAlertEmail(string $parentName, string $studentName, string $className, string $sessionName, string $sessionDate): string
{
    $safeParent = htmlspecialchars($parentName, ENT_QUOTES, 'UTF-8');
    $safeStudent = htmlspecialchars($studentName, ENT_QUOTES, 'UTF-8');
    $safeClass = htmlspecialchars($className, ENT_QUOTES, 'UTF-8');
    $safeSession = htmlspecialchars($sessionName, ENT_QUOTES, 'UTF-8');
    $safeDate = htmlspecialchars($sessionDate, ENT_QUOTES, 'UTF-8');

    return "<div style=\"font-family:Arial,sans-serif;background:#f8faf9;padding:24px;border-radius:16px\">"
        . "<h2 style=\"color:#18563e;margin:0 0 12px\">Attendance Alert</h2>"
        . "<p style=\"color:#334155;margin:0 0 16px\">Hello $safeParent,</p>"
        . "<p style=\"color:#334155;margin:0 0 16px\">This is an alert that <strong>$safeStudent</strong> has recorded <strong>3 consecutive absences</strong> in <strong>$safeClass</strong>.</p>"
        . "<div style=\"background:#eaf4ef;border-radius:12px;padding:12px 16px;margin:0 0 16px\">"
        . "<div style=\"color:#18563e;font-weight:700;font-size:14px\">Most recent session</div>"
        . "<div style=\"color:#1f2937;font-size:14px\">$safeSession</div>"
        . "<div style=\"color:#6b7280;font-size:12px;margin-top:4px\">$safeDate</div>"
        . "</div>"
        . "<p style=\"color:#334155;margin:0 0 16px\">Next steps: Please check in with your student or contact the instructor if you have questions.</p>"
        . "<p style=\"color:#6b7280;margin:0;font-size:12px\">Smart Attendance Monitoring</p>"
        . "</div>";
}

function handleConsecutiveAbsenceAlerts(PDO $pdo, array $config, int $classId, int $sessionId, array $sessionInfo): void
{
    $classStmt = $pdo->prepare('SELECT name FROM classes WHERE id = :class_id');
    $classStmt->execute(['class_id' => $classId]);
    $classRow = $classStmt->fetch();
    $className = $classRow['name'] ?? 'Class';

    $studentsStmt = $pdo->prepare('SELECT u.id, u.full_name AS fullName, u.parent_name AS parentName, u.parent_email AS parentEmail, u.parent_phone AS parentPhone
                                   FROM class_members m
                                   JOIN users u ON u.id = m.student_id
                                   WHERE m.class_id = :class_id');
    $studentsStmt->execute(['class_id' => $classId]);
    $students = $studentsStmt->fetchAll();

    foreach ($students as $student) {
        $recentStmt = $pdo->prepare('SELECT s.id, s.starts_at AS startsAt, a.status
                                     FROM sessions s
                                     LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = :student_id
                                     WHERE s.class_id = :class_id AND s.status = "closed"
                                     ORDER BY s.starts_at DESC
                                     LIMIT 4');
        $recentStmt->execute(['class_id' => $classId, 'student_id' => $student['id']]);
        $recent = $recentStmt->fetchAll();

        if (count($recent) < 3) {
            continue;
        }

        $lastThree = array_slice($recent, 0, 3);
        $allAbsent = true;
        foreach ($lastThree as $row) {
            if (($row['status'] ?? '') !== 'absent') {
                $allAbsent = false;
                break;
            }
        }
        if (!$allAbsent) {
            continue;
        }

        if ($config['notify_email_enabled']) {
            attemptEmailAlert($pdo, $config, $classId, $sessionId, $student, $className, $sessionInfo);
        }
        if ($config['notify_sms_enabled']) {
            attemptSmsAlert($pdo, $config, $classId, $sessionId, $student, $className, $sessionInfo);
        } else {
            logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'sms', 'skipped', 'SMS notifications disabled');
        }
    }
}

function attemptEmailAlert(PDO $pdo, array $config, int $classId, int $sessionId, array $student, string $className, array $sessionInfo): void
{
    if (alertAlreadySent($pdo, $classId, $sessionId, (int) $student['id'], 'email')) {
        return;
    }

    $parentEmail = trim((string) ($student['parentEmail'] ?? ''));
    if ($parentEmail === '') {
        logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'email', 'skipped', 'Missing parent email');
        return;
    }

    $parentName = $student['parentName'] ?? 'Parent';
    $studentName = $student['fullName'] ?? 'Student';
    $sessionName = $sessionInfo['sessionName'] ?? 'Session';
    $sessionDate = $sessionInfo['startsAt'] ? date('M j, Y', strtotime($sessionInfo['startsAt'])) : 'unknown date';
    $subject = 'Attendance alert: 3 consecutive absences - ' . $className;
    $textBody = "Hello $parentName,\n\n" .
        "This is an attendance alert for $studentName.\n" .
        "They have recorded 3 consecutive absences in $className.\n" .
        "Most recent session: $sessionName on $sessionDate.\n\n" .
        "Next steps: Please check in with your student or contact the instructor if you have questions.\n\n" .
        "Smart Attendance Monitoring";
    $htmlBody = buildAttendanceAlertEmail($parentName, $studentName, $className, $sessionName, $sessionDate);

    $errorMessage = null;
    $sent = sendEmailMessage($config, $parentEmail, $subject, $htmlBody, $textBody, $errorMessage);
    if ($sent) {
        logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'email', 'sent', null);
        return;
    }

    logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'email', 'failed', $errorMessage ?: 'mail delivery failed');
}

function attemptSmsAlert(PDO $pdo, array $config, int $classId, int $sessionId, array $student, string $className, array $sessionInfo): void
{
    if (alertAlreadySent($pdo, $classId, $sessionId, (int) $student['id'], 'sms')) {
        return;
    }

    $parentPhone = trim((string) ($student['parentPhone'] ?? ''));
    if ($parentPhone === '') {
        logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'sms', 'skipped', 'Missing parent phone');
        return;
    }

    if ($config['twilio_sid'] === '' || $config['twilio_token'] === '' || $config['twilio_from'] === '') {
        logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'sms', 'skipped', 'SMS provider not configured');
        return;
    }

    $studentName = $student['fullName'] ?? 'Student';
    $sessionName = $sessionInfo['sessionName'] ?? 'Session';
    $sessionDate = $sessionInfo['startsAt'] ? date('M j', strtotime($sessionInfo['startsAt'])) : 'recent session';
    $body = $studentName . ' has 3 consecutive absences in ' . $className . '. Latest: ' . $sessionName . ' (' . $sessionDate . ').';

    $errorMessage = null;
    $sent = sendTwilioSms($config['twilio_sid'], $config['twilio_token'], $config['twilio_from'], $parentPhone, $body, $errorMessage);
    if ($sent) {
        logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'sms', 'sent', null);
        return;
    }

    logAttendanceAlert($pdo, $classId, $sessionId, (int) $student['id'], 'sms', 'failed', $errorMessage ?: 'SMS failed');
}

function alertAlreadySent(PDO $pdo, int $classId, int $sessionId, int $studentId, string $channel): bool
{
    $stmt = $pdo->prepare('SELECT id FROM attendance_alerts WHERE class_id = :class_id AND session_id = :session_id AND student_id = :student_id AND alert_type = :alert_type AND channel = :channel');
    $stmt->execute([
        'class_id' => $classId,
        'session_id' => $sessionId,
        'student_id' => $studentId,
        'alert_type' => 'consecutive_absent_3',
        'channel' => $channel,
    ]);
    return (bool) $stmt->fetch();
}

function logAttendanceAlert(PDO $pdo, int $classId, int $sessionId, int $studentId, string $channel, string $status, ?string $errorMessage): void
{
    $stmt = $pdo->prepare('INSERT INTO attendance_alerts (class_id, session_id, student_id, alert_type, channel, status, error_message)
                           VALUES (:class_id, :session_id, :student_id, :alert_type, :channel, :status, :error_message)
                           ON DUPLICATE KEY UPDATE status = VALUES(status), error_message = VALUES(error_message)');
    $stmt->execute([
        'class_id' => $classId,
        'session_id' => $sessionId,
        'student_id' => $studentId,
        'alert_type' => 'consecutive_absent_3',
        'channel' => $channel,
        'status' => $status,
        'error_message' => $errorMessage,
    ]);
}

function sendTwilioSms(string $sid, string $token, string $from, string $to, string $body, ?string &$errorMessage = null): bool
{
    if (!function_exists('curl_init')) {
        $errorMessage = 'curl extension not available';
        return false;
    }

    $url = 'https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($sid) . '/Messages.json';
    $postFields = http_build_query([
        'From' => $from,
        'To' => $to,
        'Body' => $body,
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_USERPWD, $sid . ':' . $token);
    curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);

    $response = curl_exec($ch);
    if ($response === false) {
        $errorMessage = curl_error($ch);
        curl_close($ch);
        return false;
    }

    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($statusCode < 200 || $statusCode >= 300) {
        $errorMessage = 'Twilio responded with status ' . $statusCode;
        return false;
    }

    return true;
}

function makeJwt(array $claims, string $secret): string
{
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $issuedAt = time();
    $payload = array_merge($claims, ['iat' => $issuedAt, 'exp' => $issuedAt + 86400]);

    $encodedHeader = base64UrlEncode(json_encode($header));
    $encodedPayload = base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true);

    return $encodedHeader . '.' . $encodedPayload . '.' . base64UrlEncode($signature);
}

function verifyJwt(string $jwt, string $secret): ?array
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        return null;
    }

    [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;
    $expectedSignature = base64UrlEncode(hash_hmac('sha256', $encodedHeader . '.' . $encodedPayload, $secret, true));

    if (!hash_equals($expectedSignature, $encodedSignature)) {
        return null;
    }

    $payloadJson = base64UrlDecode($encodedPayload);
    $payload = json_decode($payloadJson ?: '', true);

    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
        return null;
    }

    return $payload;
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function base64UrlDecode(string $value): string
{
    return base64_decode(strtr($value, '-_', '+/')) ?: '';
}

