<?php
require 'db.php';
$error = "";

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $code = $_POST['code'];

    // Verify the code and expiration
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND reset_token = ? AND token_expire > NOW()");
    $stmt->execute([$email, $code]);
    $user = $stmt->fetch();

    if ($user) {
        // Code is correct; redirect to password reset page with a temporary session or token[cite: 2, 5]
        header("Location: reset_password.php?token=$code&email=" . urlencode($email));
        exit();
    } else {
        $error = "Invalid or expired verification code.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-gray-100 flex items-center justify-center h-screen">
    <div class="bg-white p-8 rounded-xl shadow-lg w-96 text-center">
        <h2 class="text-2xl font-bold mb-4 text-gray-800">Verify Code</h2>
        <p class="text-sm text-gray-500 mb-6">Enter the 6-digit code sent to your email.</p>
        
        <?php if($error) echo "<p class='text-red-500 text-xs mb-4'>$error</p>"; ?>

        <form method="POST" class="space-y-4">
            <input type="hidden" name="email" value="<?php echo htmlspecialchars($_GET['email'] ?? ''); ?>">
            <input type="text" name="code" maxlength="6" placeholder="000000" required 
                   class="w-full text-center text-2xl tracking-widest p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <button type="submit" class="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition">
                Verify Code
            </button>
        </form>
    </div>
</body>
</html>