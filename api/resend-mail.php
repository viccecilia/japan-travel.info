<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (php_sapi_name() !== 'cli') jt_json(['ok' => false, 'message' => 'CLI only'], 403);
$pdo = jt_db();
$rows = $pdo->query("SELECT request_id, payload_json FROM inquiry WHERE mail_status = 'mail_failed' LIMIT 20")->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    if (jt_send_mail('Japan Travel inquiry resend ' . $row['request_id'], (string)$row['payload_json'])) {
        $stmt = $pdo->prepare("UPDATE inquiry SET mail_status = 'resent_or_spooled' WHERE request_id = ?");
        $stmt->execute([$row['request_id']]);
        echo "resent {$row['request_id']}\n";
    }
}
