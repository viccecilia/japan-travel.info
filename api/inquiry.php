<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
jt_rate_limit('inquiry_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 5, 600);
if (!empty($_POST['website'] ?? '')) jt_json(['ok' => true, 'message' => 'Inquiry received, but the reservation is not confirmed yet.']);

$fields = ['name','email','phone','line_id','wechat','whatsapp','service_type','travel_date','travel_time','flight_number','pickup_location','dropoff_location','passenger_count','luggage_count','vehicle_preference','child_seat','itinerary','notes','language','source_url','source_platform','source_channel','ref_code','utm_source','utm_medium','utm_campaign','utm_content','visitor_id','idempotency_key'];
$payload = [];
foreach ($fields as $field) {
    $value = trim((string)($_POST[$field] ?? ''));
    if (strlen($value) > 1000) jt_json(['ok' => false, 'message' => 'Field too long'], 422);
    $payload[$field] = $value;
}
if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) jt_json(['ok' => false, 'message' => 'Invalid email'], 422);
if ($payload['phone'] && !preg_match('/^[0-9+()\\-\\s]{6,40}$/', $payload['phone'])) jt_json(['ok' => false, 'message' => 'Invalid phone'], 422);
if (empty($_POST['privacy_consent'])) jt_json(['ok' => false, 'message' => 'Privacy consent is required'], 422);

$requestId = jt_random_id('inq');
$payload['request_id'] = $requestId;
$payload['received_notice'] = 'Inquiry received, reservation not confirmed.';
$ipHash = jt_hash($_SERVER['REMOTE_ADDR'] ?? '');
$uaHash = jt_hash($_SERVER['HTTP_USER_AGENT'] ?? '');
$body = "New Japan Travel inquiry\nRequest: {$requestId}\n\n" . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$mailOk = jt_send_mail('Japan Travel inquiry ' . $requestId, $body);

$pdo = jt_db();
$stmt = $pdo->prepare('INSERT INTO inquiry (request_id, payload_json, email, status, mail_status, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([$requestId, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $payload['email'], 'received_not_confirmed', $mailOk ? 'sent_or_spooled' : 'mail_failed', $ipHash, $uaHash, gmdate('c')]);
jt_json(['ok' => true, 'request_id' => $requestId, 'message' => 'Inquiry received, but the reservation is not confirmed yet.', 'mail_status' => $mailOk ? 'sent_or_spooled' : 'mail_failed']);
