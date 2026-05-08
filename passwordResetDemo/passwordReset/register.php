<?php
require 'db.php'; 
require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$message = "";
$messageType = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $email = $_POST['email'];
    $password = $_POST['password'];

    // Start Transaction: "All or Nothing" approach[cite: 7]
    $pdo->beginTransaction();

    try {
        // Check if email already exists[cite: 1]
        $checkEmail = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkEmail->execute([$email]);
        
        if ($checkEmail->fetch()) {
            throw new Exception("This email address is already registered.");
        }

        // Prepare User Data[cite: 4]
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $verificationToken = bin2hex(random_bytes(16));

        // Insert User (Pending Verification)[cite: 4]
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password, verification_token, is_verified) VALUES (?, ?, ?, ?, 0)");
        $stmt->execute([$username, $email, $hashedPassword, $verificationToken]);

        // Attempt to Send Verification Email[cite: 1]
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'carlglorioso55555@gmail.com'; 
        $mail->Password   = 'xwqh qehc lgvv eoua'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom('your-email@gmail.com', 'Auth System');
        $mail->addAddress($email);
        $mail->isHTML(true);
        $mail->Subject = 'Verify Your Account';
        $mail->Body    = "
            <div style='font-family: sans-serif;'>
                <h2>Welcome, $username!</h2>
                <p>Please click the link below to verify your email and activate your account:</p>
                <a href='http://localhost/verify.php?token=$verificationToken' 
                   style='display:inline-block; background:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;'>
                   Verify Email
                </a>
            </div>";

        $mail->send();

        // Commit: If we reached here, both DB and Email succeeded[cite: 7]
        $pdo->commit();
        $message = "Registration successful! Please check your email to verify your account.";
        $messageType = "success";

    } catch (Exception $e) {
        // Rollback: Undo DB insertion if email fails or email is duplicate[cite: 7]
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        $message = $e->getMessage();
        if (strpos($message, 'PHPMailer') !== false || strpos($message, 'SMTP') !== false) {
            $message = "Account could not be created because the verification email failed to send.";
        }
        $messageType = "error";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register | Secure System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-800">Create Account</h2>
            <p class="text-gray-500 mt-2">Join us to access your dashboard</p>
        </div>

        <?php if($message): ?>
            <div class="mb-6 p-4 rounded-lg text-sm border <?php echo $messageType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'; ?>">
                <?php echo $message; ?>
            </div>
        <?php endif; ?>

        <form method="POST" id="regForm" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" name="username" required class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" name="email" required class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div class="relative">
                    <input type="password" id="password" name="password" required class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <button type="button" onclick="togglePass('password', 'eye1')" class="absolute right-3 top-3 text-gray-400">
                        <i id="eye1" class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <div class="relative">
                    <input type="password" id="confirm_password" name="confirm_password" required class="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <button type="button" onclick="togglePass('confirm_password', 'eye2')" class="absolute right-3 top-3 text-gray-400">
                        <i id="eye2" class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <!-- Password Requirements Checklist -->
            <div class="bg-gray-50 p-4 rounded-lg border text-xs space-y-2">
                <p class="font-bold text-gray-600">Password must contain:</p>
                <div id="req-length" class="text-gray-400 flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> 8+ characters</div>
                <div id="req-upper" class="text-gray-400 flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> An uppercase letter</div>
                <div id="req-symbol" class="text-gray-400 flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> A number or symbol</div>
                <div id="req-match" class="text-gray-400 flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> Passwords match</div>
            </div>

            <button type="submit" id="submitBtn" disabled class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed">
                Register
            </button>
        </form>

        <p class="mt-6 text-center text-sm text-gray-600">
            Already have an account? <a href="login.php" class="text-blue-600 font-bold hover:underline">Login</a>
        </p>
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