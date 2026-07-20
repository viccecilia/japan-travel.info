<?php
declare(strict_types=1);
require dirname(__DIR__) . '/api/bootstrap.php';

$file = $argv[1] ?? '';
$dryRun = in_array('--dry-run', $argv, true);
if (!$file || !is_file($file)) {
    fwrite(STDERR, "Usage: php tools/import-rezio-csv.php orders.csv [--dry-run]\n");
    exit(2);
}

$pdo = jt_db();
$fh = fopen($file, 'r');
$header = fgetcsv($fh);
if (!is_array($header)) {
    fwrite(STDERR, "CSV header missing\n");
    exit(2);
}

$count = 0;
$validCount = 0;
while (($row = fgetcsv($fh)) !== false) {
    $data = array_combine($header, $row);
    if (!is_array($data)) continue;
    $id = trim((string)($data['rezio_order_id'] ?? $data['order_id'] ?? ''));
    if ($id === '') continue;
    $status = strtolower(trim((string)($data['status'] ?? '')));
    $paid = strtolower(trim((string)($data['paid_status'] ?? $data['payment_status'] ?? '')));
    $valid = in_array($status, ['completed', 'fulfilled', 'complete'], true) && in_array($paid, ['paid', 'captured', 'settled'], true);
    if ($valid) $validCount++;
    $hash = hash('sha256', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    if (!$dryRun) {
        $stmt = $pdo->prepare('INSERT INTO rezio_order (rezio_order_id, email, referral_code, click_id, status, paid_status, amount, currency, service_completed_at, imported_hash, imported_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(rezio_order_id) DO UPDATE SET email=excluded.email, referral_code=excluded.referral_code, click_id=excluded.click_id, status=excluded.status, paid_status=excluded.paid_status, amount=excluded.amount, currency=excluded.currency, service_completed_at=excluded.service_completed_at, imported_hash=excluded.imported_hash, imported_at=excluded.imported_at');
        $stmt->execute([
            $id,
            strtolower(trim((string)($data['email'] ?? ''))),
            trim((string)($data['referral_code'] ?? '')),
            trim((string)($data['click_id'] ?? $data['jt_click_id'] ?? '')),
            $valid ? 'completed' : $status,
            $paid,
            trim((string)($data['amount'] ?? '')),
            strtoupper(trim((string)($data['currency'] ?? 'JPY'))),
            trim((string)($data['service_completed_at'] ?? $data['completed_at'] ?? '')),
            $hash,
            gmdate('c')
        ]);
        $userId = 0;
        $email = strtolower(trim((string)($data['email'] ?? '')));
        if ($email !== '') {
            $lookup = $pdo->prepare('SELECT id FROM member_user WHERE email = ? LIMIT 1');
            $lookup->execute([$email]);
            $userId = (int)($lookup->fetchColumn() ?: 0);
        }
        $pdo->prepare('INSERT INTO booking_reference (user_id, rezio_order_id, click_id, status, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(rezio_order_id) DO UPDATE SET user_id=excluded.user_id, click_id=excluded.click_id, status=excluded.status, payload_json=excluded.payload_json')
            ->execute([$userId ?: null, $id, trim((string)($data['click_id'] ?? $data['jt_click_id'] ?? '')), $valid ? 'valid_order' : 'not_counted', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
    }
    $count++;
}

echo ($dryRun ? 'dry-run ' : 'imported ') . $count . " rows; valid_orders " . $validCount . "\n";
