<?php
require 'db.php'; // Database connection[cite: 7]
require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$message = "";
$messageType = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];

    try {
        // 1. Check if email exists in the system[cite: 1]
        $stmt = $pdo->prepare("SELECT id, username FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // 2. Generate a 6-digit numeric reset code[cite: 1]
            $code = rand(100000, 999999);
            $expire = date("Y-m-d H:i:s", strtotime('+15 minutes'));

            // 3. Update the user record with the code and expiry[cite: 1, 5]
            $update = $pdo->prepare("UPDATE users SET reset_token = ?, token_expire = ? WHERE email = ?");
            if ($update->execute([$code, $expire, $email])) {
                
                // 4. Send the code via PHPMailer[cite: 1]
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
                $mail->Subject = 'Your Password Reset Code';
                $mail->Body    = "
                    <div style='font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;'>
                        <h2 style='color: #1e293b;'>Password Reset Request</h2>
                        <p>Hello, " . htmlspecialchars($user['username']) . ".</p>
                        <p>Your verification code is:</p>
                        <div style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0;'>
                            $code
                        </div>
                        <p style='font-size: 14px; color: #64748b;'>This code will expire in 15 minutes.</p>
                    </div>";

                $mail->send();

                // 5. Success: Redirect to the code verification page[cite: 3]
                header("Location: verify_reset.php?email=" . urlencode($email));
                exit();
            }
        } else {
            $message = "No account is associated with that email address.";
            $messageType = "error";
        }
    } catch (Exception $e) {
        $message = "An error occurred. Please try again later.";
        $messageType = "error";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Forgot Password | Secure System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <i class="fa-solid fa-key text-2xl"></i>
            </div>
            <h2 class="text-3xl font-bold text-gray-800">Forgot Password?</h2>
            <p class="text-gray-500 mt-2">Enter your email to receive a 6-digit verification code.</p>
        </div>

        <?php if($message): ?>
            <div class="mb-6 p-4 rounded-lg text-sm border <?php echo $messageType === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'; ?>">
                <i class="fa-solid <?php echo $messageType === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'; ?> mr-2"></i>
                <?php echo $message; ?>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-6">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <i class="fa-solid fa-envelope"></i>
                    </span>
                    <input type="email" name="email" placeholder="name@company.com" required 
                           class="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition">
                </div>
            </div>

            <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg active:transform active:scale-[0.98]">
                Send Reset Code
            </button>
        </form>

        <div class="mt-8 pt-6 border-t border-gray-100 text-center">
            <a href="login.php" class="text-sm text-blue-600 font-bold hover:underline">
                <i class="fa-solid fa-arrow-left mr-1"></i> Back to Login
            </a>
        </div>
    </div>

</body>
</html>