<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
$raw = (string)file_get_contents('php://input');
$secret = (string)getenv('DAITORA_CONTACT_SHARED_SECRET');
$timestamp = (string)($_SERVER['HTTP_X_DAITORA_CONTACT_TIMESTAMP'] ?? '');
$signature = (string)($_SERVER['HTTP_X_DAITORA_CONTACT_SIGNATURE'] ?? '');
$client = (string)($_SERVER['HTTP_X_DAITORA_CLIENT_ID'] ?? '');
$expected = $timestamp !== '' && $secret !== '' ? hash_hmac('sha256', $timestamp . "\n" . $raw, $secret) : '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $client !== 'japan-travel' || !ctype_digit($timestamp)
    || abs(time() - (int)$timestamp) > 300 || $expected === '' || !hash_equals($expected, $signature)) {
    http_response_code(403);
    echo json_encode(['success' => false]);
    exit;
}
$payload = json_decode($raw, true);
if (!is_array($payload) || ($payload['type'] ?? '') !== 'japan_travel' || ($payload['source_site'] ?? '') !== 'Japan Travel') {
    http_response_code(422);
    echo json_encode(['success' => false]);
    exit;
}
$capture = (string)getenv('GROUP_CONTACT_CAPTURE');
if ($capture !== '') {
    $handle = fopen($capture, 'c+');
    if ($handle && flock($handle, LOCK_EX)) {
        $existing = json_decode((string)stream_get_contents($handle), true);
        $count = (int)($existing['count'] ?? 0) + 1;
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode(['count' => $count, 'payload' => $payload], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        fflush($handle);
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
if (str_contains((string)($payload['itinerary'] ?? ''), 'force-failure')) {
    http_response_code(503);
    echo json_encode(['success' => false]);
    exit;
}
echo json_encode(['success' => true]);
