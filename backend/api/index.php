<?php

declare(strict_types=1);

header('Content-Type: application/json');

$allowedOrigins = ['http://localhost:5000', 'http://127.0.0.1:5000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$config = [
    'db_host' => '127.0.0.1',
    'db_name' => 'smart_attendance',
    'db_user' => 'root',
    'db_pass' => '',
    'jwt_secret' => 'replace-this-in-production',
];

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
    $fullName = trim((string) ($input['fullName'] ?? ''));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $role = strtolower(trim((string) ($input['role'] ?? '')));

    if ($fullName === '' || $email === '' || $password === '' || !in_array($role, ['instructor', 'student'], true)) {
        respond(422, ['message' => 'Invalid registration payload']);
    }

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        respond(409, ['message' => 'Email already registered']);
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $insert = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (:full_name, :email, :password_hash, :role)');
    $insert->execute([
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => $passwordHash,
        'role' => $role,
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

$user = requireAuth($config['jwt_secret']);

if ($path === '/instructor/classes' && $method === 'GET') {
    ensureRole($user, 'instructor');
    $stmt = $pdo->prepare('SELECT id, name, join_code AS joinCode, created_at AS createdAt FROM classes WHERE instructor_id = :instructor_id ORDER BY id DESC');
    $stmt->execute(['instructor_id' => $user['id']]);
    respond(200, ['classes' => $stmt->fetchAll()]);
}

if ($path === '/instructor/classes' && $method === 'POST') {
    ensureRole($user, 'instructor');
    $name = trim((string) ($input['name'] ?? ''));
    if ($name === '') {
        respond(422, ['message' => 'Class name is required']);
    }

    $joinCode = makeCode(8);
    $insert = $pdo->prepare('INSERT INTO classes (instructor_id, name, join_code) VALUES (:instructor_id, :name, :join_code)');
    $insert->execute([
        'instructor_id' => $user['id'],
        'name' => $name,
        'join_code' => $joinCode,
    ]);

    respond(201, [
        'class' => [
            'id' => (int) $pdo->lastInsertId(),
            'name' => $name,
            'joinCode' => $joinCode,
        ],
    ]);
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
    if (!in_array($status, ['present', 'absent'], true)) {
        respond(422, ['message' => 'Status must be present or absent']);
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

        $sessionStmt = $pdo->prepare('SELECT s.id, s.attendance_mode FROM sessions s WHERE s.class_id = :class_id AND s.status = "open" ORDER BY s.id DESC LIMIT 1');
        $sessionStmt->execute(['class_id' => $classId]);
        $session = $sessionStmt->fetch();
        if (!$session) {
            respond(404, ['message' => 'No open session found for class']);
        }
    } else {
        $sessionStmt = $pdo->prepare('SELECT s.id, s.class_id AS classId, s.attendance_mode FROM sessions s WHERE s.session_code = :session_code AND s.status = "open"');
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

    $insert = $pdo->prepare('INSERT INTO attendance (session_id, student_id, method, status) VALUES (:session_id, :student_id, :method, "pending") ON DUPLICATE KEY UPDATE method = VALUES(method), checked_in_at = NOW(), status = "pending"');
    $insert->execute([
        'session_id' => $session['id'],
        'student_id' => $user['id'],
        'method' => $methodName,
    ]);

    respond(200, ['message' => 'Check-in submitted and awaiting instructor review']);
}

if ($path === '/student/attendance' && $method === 'GET') {
    ensureRole($user, 'student');
    $sql = 'SELECT a.id, c.name AS className, s.session_name AS sessionName, s.session_code AS sessionCode, a.method, a.status, a.checked_in_at AS checkedInAt
            FROM attendance a
            JOIN sessions s ON s.id = a.session_id
            JOIN classes c ON c.id = s.class_id
            WHERE a.student_id = :student_id
            ORDER BY a.id DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['student_id' => $user['id']]);
    respond(200, ['attendance' => $stmt->fetchAll()]);
}

respond(404, ['message' => 'Route not found']);

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
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

