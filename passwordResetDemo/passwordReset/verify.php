<?php
require 'db.php';

if (isset($_GET['token'])) {
    $token = $_GET['token'];
    $stmt = $pdo->prepare("SELECT id FROM users WHERE verification_token = ? AND is_verified = 0");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if ($user) {
        $update = $pdo->prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?");
        $update->execute([$user['id']]);
        $status = "Account verified! You can now <a href='login.php' class='text-blue-600 underline'>login</a>.";
    } else {
        $status = "Invalid or expired token.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-gray-100 flex items-center justify-center h-screen">
    <div class="bg-white p-8 rounded shadow-md text-center">
        <h2 class="text-xl font-bold mb-4">Email Verification</h2>
        <p><?php echo $status; ?></p>
    </div>
</body>
</html>