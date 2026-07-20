<?php
declare(strict_types=1);

$tmp = sys_get_temp_dir() . '/jt_php_test_' . bin2hex(random_bytes(6));
putenv('APP_ENV=development');
putenv('APP_DATA_DIR=' . $tmp);
putenv('APP_SECRET=test-secret-with-more-than-thirty-two-characters');
putenv('MAIL_TRANSPORT=spool');
putenv('SITE_URL=https://japan-travel.info');
putenv('REZIO_ROUTE_URLS_JSON={"kyoto":"https://demo.rezio.shop/products/kyoto"}');
require dirname(__DIR__, 2) . '/api/bootstrap.php';

function ok(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}

$pdo = jt_db();
ok($pdo instanceof PDO, 'database opens');
ok((int)$pdo->query('PRAGMA foreign_keys')->fetchColumn() === 1, 'foreign keys enabled');

$pdo->prepare('INSERT INTO member_user (email, password_hash, referral_code, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?)')
    ->execute(['owner@example.com', password_hash('Password1234', PASSWORD_DEFAULT), 'JTOWNER1', gmdate('c'), gmdate('c')]);
$ownerId = (int)$pdo->lastInsertId();
$pdo->prepare('INSERT INTO member_user (email, password_hash, referral_code, email_verified_at, created_at) VALUES (?, ?, ?, ?, ?)')
    ->execute(['friend@example.com', password_hash('Password1234', PASSWORD_DEFAULT), 'JTFRIEND1', gmdate('c'), gmdate('c')]);
$friendId = (int)$pdo->lastInsertId();

$token = jt_create_token($ownerId, 'email_verification', 300);
ok(strlen($token) >= 32, 'raw token generated');
ok(jt_consume_token('email_verification', $token) !== null, 'token consumed once');
ok(jt_consume_token('email_verification', $token) === null, 'token cannot be reused');

$mail = jt_send_mail('test@example.com', 'Japan Travel test', 'hello');
ok($mail['status'] === 'spooled', 'development mail spools');
ok(count(glob($tmp . '/mail_spool/*.txt')) === 1, 'spool file written');

$urls = jt_allowed_rezio_urls();
ok(isset($urls['kyoto']), 'rezio.shop host is allowed');
$withQuery = jt_url_with_query($urls['kyoto'], ['click_id' => 'clk_1', 'utm_source' => 'site']);
ok(str_contains($withQuery, 'click_id=clk_1'), 'rezio query appended');

$pdo->prepare('INSERT INTO referral_click (referral_code, click_id, landing_page, created_at) VALUES (?, ?, ?, ?)')
    ->execute(['JTOWNER1', 'clk_ref_1', '/en/?ref_code=JTOWNER1', gmdate('c')]);
$pdo->prepare('INSERT INTO booking_reference (user_id, rezio_order_id, click_id, status, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$friendId, 'RZ-1', 'clk_ref_1', 'valid_order', json_encode(['email' => 'friend@example.com', 'referral_code' => 'JTOWNER1']), gmdate('c')]);
ok(jt_update_vip_tier($pdo, $ownerId, 'test') === 'VIP Friend', 'direct referral upgrades to VIP Friend');

$pdo->prepare('UPDATE booking_reference SET status = ? WHERE rezio_order_id = ?')->execute(['revoked', 'RZ-1']);
ok(jt_update_vip_tier($pdo, $ownerId, 'refund') === 'Visitor', 'refund/revocation downgrades tier');

echo "OK php integration\n";
