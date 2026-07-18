<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

$key = preg_replace('/[^a-z0-9_\\-]/i', '', (string)($_GET['product_key'] ?? ''));
$urls = jt_allowed_rezio_urls();
$destination = $urls[$key] ?? ($urls['default'] ?? '');
if (!$key || !$destination) {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html><head><meta name="robots" content="noindex,follow"><title>Rezio link unavailable</title></head><body><h1>Rezio link unavailable</h1><p>This booking product is not configured yet. No reservation has been made.</p></body></html>';
    exit;
}

$clickId = jt_random_id('clk');
$pdo = jt_db();
$stmt = $pdo->prepare('INSERT INTO rezio_click (click_id, visitor_id, user_id, ref_code, product_key, language, landing_page, source_page, utm_source, utm_medium, utm_campaign, utm_content, destination_url_key, ip_hash, user_agent_hash, clicked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $clickId,
    (string)($_GET['visitor_id'] ?? ''),
    '',
    (string)($_GET['ref_code'] ?? ''),
    $key,
    (string)($_GET['language'] ?? ''),
    (string)($_GET['landing_page'] ?? ''),
    $_SERVER['HTTP_REFERER'] ?? '',
    (string)($_GET['utm_source'] ?? ''),
    (string)($_GET['utm_medium'] ?? ''),
    (string)($_GET['utm_campaign'] ?? ''),
    (string)($_GET['utm_content'] ?? ''),
    $key,
    jt_hash($_SERVER['REMOTE_ADDR'] ?? ''),
    jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''),
    gmdate('c')
]);
header('Location: ' . $destination, true, 302);
exit;
