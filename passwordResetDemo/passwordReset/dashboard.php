<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <nav class="bg-white shadow-sm p-4 flex justify-between items-center px-8">
        <h1 class="text-xl font-bold text-gray-800">Secure App</h1>
        <a href="logout.php" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition">Logout</a>
    </nav>

    <main class="max-w-4xl mx-auto mt-10 p-6">
        <div class="bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Welcome Back!</h2>
            <p class="text-gray-600">You are securely logged into your account.</p>
            
            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 border rounded-lg bg-blue-50">
                    <span class="block font-bold text-blue-700 text-xs uppercase tracking-wider">User ID</span>
                    <span class="text-lg font-mono"><?php echo $_SESSION['user_id']; ?></span>
                </div>
                <div class="p-4 border rounded-lg bg-green-50">
                    <span class="block font-bold text-green-700 text-xs uppercase tracking-wider">Status</span>
                    <span class="text-lg text-green-600 font-medium">Verified Active</span>
                </div>
            </div>
        </div>
    </main>
</body>
</html>