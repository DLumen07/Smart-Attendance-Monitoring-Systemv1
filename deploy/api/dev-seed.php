<?php

declare(strict_types=1);

header('Content-Type: application/json');

$config = [
    'db_host' => '127.0.0.1',
    'db_name' => 'smart_attendance',
    'db_user' => 'root',
    'db_pass' => '',
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

$seed = [
    'full_name' => 'Sample Instructor',
    'email' => 'instructor@demo.local',
    'password' => 'Instructor123!',
    'role' => 'instructor',
];

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email');
$stmt->execute(['email' => $seed['email']]);
$existing = $stmt->fetch();

if ($existing) {
    respond(200, [
        'message' => 'Sample instructor already exists.',
        'user' => [
            'email' => $seed['email'],
            'password' => $seed['password'],
            'role' => $seed['role'],
        ],
    ]);
}

$insert = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (:full_name, :email, :password_hash, :role)');
$insert->execute([
    'full_name' => $seed['full_name'],
    'email' => $seed['email'],
    'password_hash' => password_hash($seed['password'], PASSWORD_BCRYPT),
    'role' => $seed['role'],
]);

respond(201, [
    'message' => 'Sample instructor created.',
    'user' => [
        'email' => $seed['email'],
        'password' => $seed['password'],
        'role' => $seed['role'],
    ],
]);

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}
