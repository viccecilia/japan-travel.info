<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);

jt_session_start();
$key = preg_replace('/[^a-z0-9_\\-]/i', '', (string)($_GET['product_key'] ?? ''));
$urls = jt_allowed_rezio_urls();
$destination = $urls[$key] ?? ($urls['default'] ?? '');
if (!$key || !$destination) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo '<!doctype html><html><head><meta name="robots" content="noindex,follow"><title>Rezio link unavailable</title></head><body><h1>Rezio link unavailable</h1><p>This booking product is not configured yet. No reservation has been made.</p></body></html>';
    exit;
}

$clickId = jt_random_id('clk');
$utm = [
    'utm_source' => (string)($_GET['utm_source'] ?? 'japan-travel-info'),
    'utm_medium' => (string)($_GET['utm_medium'] ?? 'website'),
    'utm_campaign' => (string)($_GET['utm_campaign'] ?? 'kansai-guide'),
    'utm_content' => (string)($_GET['utm_content'] ?? $key),
    'click_id' => $clickId,
    'jt_click_id' => $clickId,
    'ref_code' => (string)($_GET['ref_code'] ?? ''),
    'language' => (string)($_GET['language'] ?? '')
];
$finalUrl = jt_url_with_query($destination, $utm);

$pdo = jt_db();
$userId = jt_current_user_id() ?: null;
$stmt = $pdo->prepare('INSERT INTO rezio_click (click_id, visitor_id, user_id, ref_code, product_key, language, landing_page, source_page, utm_source, utm_medium, utm_campaign, utm_content, destination_url_key, destination_url, ip_hash, user_agent_hash, clicked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $clickId,
    (string)($_GET['visitor_id'] ?? ''),
    $userId,
    (string)($_GET['ref_code'] ?? ''),
    $key,
    (string)($_GET['language'] ?? ''),
    (string)($_GET['landing_page'] ?? ''),
    $_SERVER['HTTP_REFERER'] ?? '',
    $utm['utm_source'],
    $utm['utm_medium'],
    $utm['utm_campaign'],
    $utm['utm_content'],
    $key,
    $finalUrl,
    jt_hash($_SERVER['REMOTE_ADDR'] ?? ''),
    jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''),
    gmdate('c')
]);
if (!empty($_GET['ref_code'])) {
    $pdo->prepare('INSERT OR IGNORE INTO referral_click (referral_code, click_id, landing_page, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([(string)$_GET['ref_code'], $clickId, (string)($_GET['landing_page'] ?? ''), jt_hash($_SERVER['REMOTE_ADDR'] ?? ''), jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''), gmdate('c')]);
}
jt_audit_log('rezio_click', ['click_id' => $clickId, 'product_key' => $key], $userId);
header('Location: ' . $finalUrl, true, 302);
exit;
