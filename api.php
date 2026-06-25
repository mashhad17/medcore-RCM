<?php
/* ============================================================
   MedCore HMS — JSON API
   GET  api.php?resource=appointments|payments|queue|activity|all
   POST api.php?resource=<one of the above>  (body = JSON array)
        replaces that collection in the database.
   ============================================================ */

require_once __DIR__ . '/lib.php';
header('Content-Type: application/json');

$resource = $_GET['resource'] ?? '';
$method   = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = medcore_db();

    if ($method === 'GET') {
        switch ($resource) {
            case 'appointments': echo json_encode(mc_get_appointments($pdo)); break;
            case 'payments':     echo json_encode(mc_get_payments($pdo));     break;
            case 'queue':        echo json_encode(mc_get_queue($pdo));        break;
            case 'activity':     echo json_encode(mc_get_activity($pdo));     break;
            case 'all':
                echo json_encode([
                    'appointments' => mc_get_appointments($pdo),
                    'payments'     => mc_get_payments($pdo),
                    'queue'        => mc_get_queue($pdo),
                    'activity'     => mc_get_activity($pdo),
                ]);
                break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'unknown resource']);
        }
        exit;
    }

    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) $body = [];

        switch ($resource) {
            case 'appointments': mc_save_appointments($pdo, $body); break;
            case 'payments':     mc_save_payments($pdo, $body);     break;
            case 'queue':        mc_save_queue($pdo, $body);        break;
            case 'activity':     mc_save_activity($pdo, $body);     break;
            default:
                http_response_code(400);
                echo json_encode(['error' => 'unknown resource']);
                exit;
        }
        echo json_encode(['ok' => true, 'count' => count($body)]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'method not allowed']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
