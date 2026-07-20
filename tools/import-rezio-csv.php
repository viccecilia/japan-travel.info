<?php
declare(strict_types=1);
require dirname(__DIR__) . '/api/bootstrap.php';

$file = $argv[1] ?? '';
$dryRun = in_array('--dry-run', $argv, true);
if (!$file || !is_file($file)) {
    fwrite(STDERR, "Usage: php tools/import-rezio-csv.php orders.csv [--dry-run]\n");
    exit(2);
}

function row_value(array $data, array $keys): string {
    foreach ($keys as $key) {
        if (isset($data[$key]) && trim((string)$data[$key]) !== '') return trim((string)$data[$key]);
    }
    return '';
}
function order_state(string $status, string $paid, int $userId): string {
    if (in_array($status, ['cancelled', 'canceled', 'refunded', 'void'], true) || in_array($paid, ['refunded', 'chargeback', 'void'], true)) return 'revoked';
    if (in_array($status, ['completed', 'fulfilled', 'complete'], true) && in_array($paid, ['paid', 'captured', 'settled'], true)) {
        return $userId > 0 ? 'valid_order' : 'manual_review';
    }
    return 'manual_review';
}
function lookup_user(PDO $pdo, string $email, string $clickId): int {
    if ($email !== '') {
        $stmt = $pdo->prepare('SELECT id FROM member_user WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $id = (int)($stmt->fetchColumn() ?: 0);
        if ($id) return $id;
    }
    if ($clickId !== '') {
        $stmt = $pdo->prepare('SELECT user_id FROM rezio_click WHERE click_id = ? AND user_id IS NOT NULL LIMIT 1');
        $stmt->execute([$clickId]);
        return (int)($stmt->fetchColumn() ?: 0);
    }
    return 0;
}
function normalize_referral(PDO $pdo, int $userId, string $referralCode): string {
    if ($userId <= 0 || $referralCode === '') return $referralCode;
    $stmt = $pdo->prepare('SELECT referral_code FROM member_user WHERE id = ?');
    $stmt->execute([$userId]);
    $own = (string)($stmt->fetchColumn() ?: '');
    return ($own !== '' && hash_equals($own, $referralCode)) ? '' : $referralCode;
}
function referral_owner_id(PDO $pdo, string $referralCode): int {
    if ($referralCode === '') return 0;
    $stmt = $pdo->prepare('SELECT user_id FROM referral WHERE code = ? LIMIT 1');
    $stmt->execute([$referralCode]);
    $id = (int)($stmt->fetchColumn() ?: 0);
    if ($id) return $id;
    $stmt = $pdo->prepare('SELECT id FROM member_user WHERE referral_code = ? LIMIT 1');
    $stmt->execute([$referralCode]);
    return (int)($stmt->fetchColumn() ?: 0);
}

$pdo = jt_db();
$fh = fopen($file, 'r');
$header = fgetcsv($fh, null, ',', '"', '\\');
if (!is_array($header)) {
    fwrite(STDERR, "CSV header missing\n");
    exit(2);
}

$count = 0;
$validCount = 0;
$manualCount = 0;
$revokedCount = 0;
$affectedUsers = [];
while (($row = fgetcsv($fh, null, ',', '"', '\\')) !== false) {
    $data = array_combine($header, $row);
    if (!is_array($data)) continue;
    $id = row_value($data, ['rezio_order_id', 'order_id']);
    if ($id === '') continue;
    $status = strtolower(row_value($data, ['status', 'order_status']));
    $paid = strtolower(row_value($data, ['paid_status', 'payment_status']));
    $email = strtolower(row_value($data, ['email', 'customer_email']));
    $clickId = row_value($data, ['click_id', 'jt_click_id']);
    $userId = lookup_user($pdo, $email, $clickId);
    $referralCode = normalize_referral($pdo, $userId, row_value($data, ['referral_code', 'ref_code']));
    if ($referralCode !== (row_value($data, ['referral_code', 'ref_code']))) $data['self_referral_removed'] = '1';
    $data['referral_code'] = $referralCode;
    $referrerId = referral_owner_id($pdo, $referralCode);
    $state = order_state($status, $paid, $userId);
    if ($state === 'valid_order') $validCount++;
    if ($state === 'manual_review') $manualCount++;
    if ($state === 'revoked') $revokedCount++;
    if ($userId) $affectedUsers[$userId] = true;
    if ($referrerId) $affectedUsers[$referrerId] = true;
    $hash = hash('sha256', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    if (!$dryRun) {
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO rezio_order (rezio_order_id, email, referral_code, click_id, status, paid_status, amount, currency, service_completed_at, imported_hash, imported_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(rezio_order_id) DO UPDATE SET email=excluded.email, referral_code=excluded.referral_code, click_id=excluded.click_id, status=excluded.status, paid_status=excluded.paid_status, amount=excluded.amount, currency=excluded.currency, service_completed_at=excluded.service_completed_at, imported_hash=excluded.imported_hash, imported_at=excluded.imported_at')
                ->execute([
                    $id,
                    $email,
                    $referralCode,
                    $clickId,
                    $status,
                    $paid,
                    row_value($data, ['amount']),
                    strtoupper(row_value($data, ['currency'])) ?: 'JPY',
                    row_value($data, ['service_completed_at', 'completed_at']),
                    $hash,
                    gmdate('c')
                ]);
            $pdo->prepare('INSERT INTO booking_reference (user_id, rezio_order_id, click_id, status, payload_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(rezio_order_id) DO UPDATE SET user_id=excluded.user_id, click_id=excluded.click_id, status=excluded.status, payload_json=excluded.payload_json')
                ->execute([$userId ?: null, $id, $clickId, $state, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), gmdate('c')]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
    $count++;
}

if (!$dryRun) {
    foreach (array_keys($affectedUsers) as $userId) jt_update_vip_tier($pdo, (int)$userId, 'rezio_import');
}

echo ($dryRun ? 'dry-run ' : 'imported ') . $count . " rows; valid_orders {$validCount}; manual_review {$manualCount}; revoked {$revokedCount}\n";
