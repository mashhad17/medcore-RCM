<?php
/* ============================================================
   MedCore HMS — Top Waiting Queue API
   Retrieves top 4 longest-waiting patients and calculates exact
   wait time in minutes server-side.
   ============================================================ */

require_once __DIR__ . '/../../config.php';
header('Content-Type: application/json');

try {
    $pdo = medcore_db();

    // Query top 4 patients from live_queue, ordering by earliest checked_in_at
    $sql = "SELECT p.full_name AS patient_name, q.doctor_label AS doctor_name, q.checked_in_at
            FROM live_queue q
            JOIN patients p ON q.patient_id = p.id
            ORDER BY q.checked_in_at ASC
            LIMIT 4";
    
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll();

    $now = time();
    $result = [];

    foreach ($rows as $row) {
        // Calculate wait time dynamically on the PHP server
        $checkInTime = strtotime($row['checked_in_at']);
        // If parsing fails, default to 0
        $waitMinutes = $checkInTime ? floor(($now - $checkInTime) / 60) : 0;
        
        // Ensure we don't show negative minutes if clock is slightly skewed
        if ($waitMinutes < 0) {
            $waitMinutes = 0;
        }

        $result[] = [
            'patient_name' => $row['patient_name'],
            'doctor_name'  => $row['doctor_name'],
            'wait_time_minutes' => (int)$waitMinutes
        ];
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'details' => $e->getMessage()]);
}
