<?php
require 'db.php'; // Database connection[cite: 7]

$email = $_GET['email'] ?? '';
$token = $_GET['token'] ?? ''; // This is the 6-digit code verified in verify_reset.php[cite: 5]
$message = "";
$messageType = "";

// Security Check: Verify the email and code are still valid and not expired[cite: 5, 7]
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND reset_token = ? AND token_expire > NOW()");
$stmt->execute([$email, $token]);
$user = $stmt->fetch();

if (!$user) {
    // If accessed directly without a valid session/token, redirect back to start
    header("Location: forgot_password.php");
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $password = $_POST['password'];
    $confirmPassword = $_POST['confirm_password'];

    if ($password !== $confirmPassword) {
        $message = "Passwords do not match.";
        $messageType = "error";
    } else {
        // Hash the new password using BCRYPT[cite: 4, 5]
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        // Update password and clear the reset token/expiry for security[cite: 5]
        $update = $pdo->prepare("UPDATE users SET password = ?, reset_token = NULL, token_expire = NULL WHERE id = ?");
        
        if ($update->execute([$hashedPassword, $user['id']])) {
            $message = "Password updated successfully! You can now log in.";
            $messageType = "success";
        } else {
            $message = "Failed to update password. Please try again.";
            $messageType = "error";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password | Secure System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-800">New Password</h2>
            <p class="text-gray-500 mt-2">Please choose a strong password</p>
        </div>

        <?php if($message): ?>
            <div class="mb-6 p-4 rounded-lg text-sm border <?php echo $messageType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'; ?>">
                <?php echo $message; ?>
                <?php if($messageType === 'success'): ?>
                    <div class="mt-2"><a href="login.php" class="font-bold underline">Go to Login</a></div>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <?php if($messageType !== 'success'): ?>
        <form method="POST" id="resetForm" class="space-y-4">
            <!-- Password Field -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div class="relative">
                    <input type="password" name="password" id="password" required 
                           class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <button type="button" onclick="togglePass('password', 'eye1')" class="absolute right-3 top-3 text-gray-400">
                        <i id="eye1" class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <!-- Confirm Password Field -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div class="relative">
                    <input type="password" name="confirm_password" id="confirm_password" required 
                           class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <button type="button" onclick="togglePass('confirm_password', 'eye2')" class="absolute right-3 top-3 text-gray-400">
                        <i id="eye2" class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <!-- Real-time Checklist -->
            <div class="bg-gray-50 p-4 rounded-lg border text-xs space-y-2">
                <p class="font-bold text-gray-600">Requirements:</p>
                <div id="req-length" class="text-gray-400 flex items-center transition-colors">
                    <i class="fa-solid fa-circle-check mr-2"></i> 8+ characters
                </div>
                <div id="req-upper" class="text-gray-400 flex items-center transition-colors">
                    <i class="fa-solid fa-circle-check mr-2"></i> An uppercase letter
                </div>
                <div id="req-symbol" class="text-gray-400 flex items-center transition-colors">
                    <i class="fa-solid fa-circle-check mr-2"></i> A number or symbol
                </div>
                <div id="req-match" class="text-gray-400 flex items-center transition-colors">
                    <i class="fa-solid fa-circle-check mr-2"></i> Passwords match
                </div>
            </div>

            <button type="submit" id="submitBtn" disabled 
                    class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed">
                Reset Password
            </button>
        </form>
        <?php endif; ?>
    </div>

    <script>
        const pass = document.getElementById('password');
        const conf = document.getElementById('confirm_password');
        const btn = document.getElementById('submitBtn');

        function togglePass(id, eyeId) {
            const input = document.getElementById(id);
            const icon = document.getElementById(eyeId);
            input.type = input.type === 'password' ? 'text' : 'password';
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }

        function validate() {
            const v = pass.value;
            const c = conf.value;
            const checks = {
                length: v.length >= 8,
                upper: /[A-Z]/.test(v),
                symbol: /[0-9!@#$%^&*]/.test(v),
                match: v === c && v.length > 0
            };

            updateUI('req-length', checks.length);
            updateUI('req-upper', checks.upper);
            updateUI('req-symbol', checks.symbol);
            updateUI('req-match', checks.match);

            btn.disabled = !Object.values(checks).every(Boolean);
        }

        function updateUI(id, ok) {
            const el = document.getElementById(id);
            el.classList.toggle('text-green-600', ok);
            el.classList.toggle('text-gray-400', !ok);
        }

        pass.addEventListener('input', validate);
        conf.addEventListener('input', validate);
    </script>
</body>
</html>