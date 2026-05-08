<?php
session_start();
require 'db.php'; // Database connection using PDO[cite: 7]

$error = "";
$success = "";

// Check if user reached this page via a successful verification from verify.php
if (isset($_GET['verified']) && $_GET['verified'] == 1) {
    $success = "Email verified successfully! You can now log in.";
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $pass = $_POST['password'];

    // Retrieve user data by email
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Validate credentials[cite: 2]
    if ($user && password_verify($pass, $user['password'])) {
        
        // Check if the email address has been confirmed[cite: 2]
        if ($user['is_verified'] == 0) {
            $error = "Your account is not verified. Please check your email for the verification link.";
        } else {
            // Successful login: Set session and redirect to dashboard[cite: 2, 6]
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            header("Location: dashboard.php");
            exit();
        }
    } else {
        $error = "Invalid email or password.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Secure System</title>
    <!-- Tailwind CSS via CDN[cite: 6] -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen p-4">

    <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-800">Welcome Back</h2>
            <p class="text-gray-500 mt-2">Please enter your details to login</p>
        </div>

        <!-- Alert Messages -->
        <?php if($error): ?>
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
                <span class="block sm:inline"><?php echo $error; ?></span>
            </div>
        <?php endif; ?>

        <?php if($success): ?>
            <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 text-sm" role="alert">
                <span class="block sm:inline"><?php echo $success; ?></span>
            </div>
        <?php endif; ?>

        <form method="POST" class="space-y-5">
            <!-- Email Input -->
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <i class="fa-solid fa-envelope"></i>
                    </span>
                    <input type="email" name="email" placeholder="name@company.com" required 
                           class="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                </div>
            </div>

            <!-- Password Input with Toggle -->
            <div>
                <div class="flex justify-between mb-1">
                    <label class="block text-sm font-medium text-gray-700">Password</label>
                    <a href="forgot_password.php" class="text-xs text-blue-600 hover:underline">Forgot password?</a>
                </div>
                <div class="relative">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                        <i class="fa-solid fa-lock"></i>
                    </span>
                    <input type="password" name="password" id="loginPassword" placeholder="••••••••" required 
                           class="w-full pl-10 pr-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                    <button type="button" onclick="togglePassword()" class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                        <i id="eyeIcon" class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="w-full bg-blue-600 text-white p-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg active:transform active:scale-[0.98]">
                Sign In
            </button>
        </form>

        <div class="mt-8 pt-6 border-t border-gray-100 text-center">
            <p class="text-sm text-gray-600">
                Don't have an account? 
                <a href="register.php" class="text-blue-600 font-bold hover:underline ml-1">Create an Account</a>
            </p>
        </div>
    </div>

    <script>
        function togglePassword() {
            const field = document.getElementById('loginPassword');
            const icon = document.getElementById('eyeIcon');
            if (field.type === "password") {
                field.type = "text";
                icon.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                field.type = "password";
                icon.classList.replace("fa-eye-slash", "fa-eye");
            }
        }
    </script>
</body>
</html>