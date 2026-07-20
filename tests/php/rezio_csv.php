<?php
declare(strict_types=1);

$root = dirname(__DIR__, 2);
$tmp = sys_get_temp_dir() . '/jt_csv_test_' . bin2hex(random_bytes(4));
putenv('APP_ENV=development');
putenv('APP_DATA_DIR=' . $tmp);
putenv('APP_SECRET=test-secret-with-more-than-thirty-two-characters');
putenv('MAIL_TRANSPORT=spool');
require $root . '/api/bootstrap.php';

function ok(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$pdo = jt_db();
$pdo->prepare('INSERT INTO member_user (email, password_hash, referral_code, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?)')
    ->execute(['owner@example.com', password_hash('Password1234', PASSWORD_DEFAULT), 'JTOWNCSV', gmdate('c'), gmdate('c')]);
$ownerId = (int)$pdo->lastInsertId();
$pdo->prepare('INSERT INTO member_user (email, password_hash, referral_code, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?)')
    ->execute(['friend@example.com', password_hash('Password1234', PASSWORD_DEFAULT), 'JTFRDCSV', gmdate('c'), gmdate('c')]);
$friendId = (int)$pdo->lastInsertId();
$pdo->prepare('INSERT INTO rezio_click (click_id, visitor_id, user_id, ref_code, product_key, clicked_at) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute(['clk_friend', 'vis1', $friendId, 'JTOWNCSV', 'kyoto', gmdate('c')]);

$csv = $tmp . '/orders.csv';
file_put_contents($csv, "rezio_order_id,email,referral_code,click_id,status,paid_status,amount,currency\n" .
    "RZ1,friend@example.com,JTOWNCSV,clk_friend,completed,paid,10000,JPY\n" .
    "RZ2,owner@example.com,JTOWNCSV,,completed,paid,10000,JPY\n" .
    "RZ3,,JTOWNCSV,,completed,paid,10000,JPY\n");
$php = escapeshellarg(PHP_BINARY);
if ($extDir = getenv('PHP_TEST_EXTENSION_DIR')) {
    $php .= ' -d ' . escapeshellarg('extension_dir=' . $extDir)
        . ' -d extension=pdo_sqlite -d extension=mbstring -d extension=openssl';
}
exec($php . ' ' . escapeshellarg($root . '/tools/import-rezio-csv.php') . ' ' . escapeshellarg($csv), $out, $code);
if ($code !== 0) fwrite(STDERR, "CSV import output:\n" . implode("\n", $out) . "\n");
ok($code === 0, 'csv import exits 0');
$valid = (int)$pdo->query("SELECT COUNT(*) FROM booking_reference WHERE status = 'valid_order'")->fetchColumn();
$manual = (int)$pdo->query("SELECT COUNT(*) FROM booking_reference WHERE status = 'manual_review'")->fetchColumn();
ok($valid === 2 && $manual === 1, 'valid and manual review states are assigned');
$self = $pdo->query("SELECT payload_json FROM booking_reference WHERE rezio_order_id = 'RZ2'")->fetchColumn();
ok(!str_contains((string)$self, 'JTOWNCSV'), 'self referral is removed');
ok(jt_vip_tier_for($pdo, $ownerId) === 'VIP Friend', 'owner upgraded by direct referral');

exec($php . ' ' . escapeshellarg($root . '/tools/import-rezio-csv.php') . ' ' . escapeshellarg($csv), $out2, $code2);
if ($code2 !== 0) fwrite(STDERR, "CSV duplicate import output:\n" . implode("\n", $out2) . "\n");
ok($code2 === 0 && (int)$pdo->query("SELECT COUNT(*) FROM booking_reference WHERE rezio_order_id = 'RZ1'")->fetchColumn() === 1, 'duplicate import is idempotent');

file_put_contents($csv, "rezio_order_id,email,referral_code,click_id,status,paid_status,amount,currency\nRZ1,friend@example.com,JTOWNCSV,clk_friend,refunded,refunded,10000,JPY\n");
exec($php . ' ' . escapeshellarg($root . '/tools/import-rezio-csv.php') . ' ' . escapeshellarg($csv), $out3, $code3);
if ($code3 !== 0) fwrite(STDERR, "CSV refund import output:\n" . implode("\n", $out3) . "\n");
ok($code3 === 0, 'refund import exits 0');
ok($pdo->query("SELECT status FROM booking_reference WHERE rezio_order_id = 'RZ1'")->fetchColumn() === 'revoked', 'refunded order revokes valid state');
jt_update_vip_tier($pdo, $ownerId, 'refund-test');
ok(jt_vip_tier_for($pdo, $ownerId) === 'Member', 'tier recomputed after refund');

echo "OK Rezio CSV business rules\n";
