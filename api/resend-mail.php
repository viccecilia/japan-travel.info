<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (php_sapi_name() !== 'cli') jt_json(['ok' => false, 'message' => 'CLI only'], 403);
$pdo = jt_db();
$rows = $pdo->query("SELECT request_id, payload_json FROM inquiry WHERE mail_status IN ('mail_failed', 'failed') LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    $payload = json_decode((string)$row['payload_json'], true);
    $mail = is_array($payload) ? jt_forward_group_contact($payload) : ['ok' => false, 'status' => 'failed', 'error' => 'Invalid inquiry payload'];
    if ($mail['ok']) {
        $stmt = $pdo->prepare("UPDATE inquiry SET mail_status = ?, mail_error = ? WHERE request_id = ?");
        $stmt->execute([$mail['status'], $mail['error'], $row['request_id']]);
        echo "resent {$row['request_id']}\n";
    }
}
