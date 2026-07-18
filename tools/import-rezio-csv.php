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
$count = 0;
while (($row = fgetcsv($fh)) !== false) {
    $data = array_combine($header, $row);
    $id = (string)($data['rezio_order_id'] ?? '');
    if ($id === '') continue;
    $status = strtolower((string)($data['status'] ?? ''));
    $paid = strtolower((string)($data['paid_status'] ?? ''));
    $hash = hash('sha256', json_encode($data));
    $valid = in_array($status, ['completed','fulfilled'], true) && in_array($paid, ['paid','captured'], true);
    if (!$dryRun) {
        $stmt = $pdo->prepare('INSERT INTO rezio_order (rezio_order_id, email, referral_code, status, paid_status, service_completed_at, imported_hash, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(rezio_order_id) DO UPDATE SET status=excluded.status, paid_status=excluded.paid_status, imported_hash=excluded.imported_hash, imported_at=excluded.imported_at');
        $stmt->execute([$id, $data['email'] ?? '', $data['referral_code'] ?? '', $valid ? 'completed' : $status, $paid, $data['service_completed_at'] ?? '', $hash, gmdate('c')]);
    }
    $count++;
}
echo ($dryRun ? 'dry-run ' : 'imported ') . $count . " rows\n";
