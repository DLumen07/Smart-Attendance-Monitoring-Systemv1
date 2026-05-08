<?php
$dbHost = "localhost";
$dbName = "smart_attendance";
$dbUser = "root";
$dbPass = "";

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $sql = "CREATE TABLE IF NOT EXISTS class_schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      class_id INT NOT NULL,
      day_of_week VARCHAR(20) NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      CONSTRAINT fk_schedules_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );";
    
    $pdo->exec($sql);
    echo "Migration successful.";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage();
}
?>
