<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
jt_session_start();
jt_require_same_origin();
jt_require_csrf();
jt_rate_limit('inquiry_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 8, 600);

$input = jt_input();
if (!empty($input['website'] ?? '')) {
    jt_json(['ok' => true, 'message' => 'Inquiry received, but the reservation is not confirmed yet.']);
}

$fields = ['name','email','phone','line_id','wechat','whatsapp','service_type','travel_date','travel_time','flight_number','pickup_location','dropoff_location','passenger_count','luggage_count','vehicle_preference','child_seat','itinerary','notes','language','source_url','source_platform','source_channel','ref_code','utm_source','utm_medium','utm_campaign','utm_content','visitor_id','idempotency_key'];
$payload = [];
foreach ($fields as $field) {
    $value = trim((string)($input[$field] ?? ''));
    if (strlen($value) > 1000) jt_json(['ok' => false, 'message' => 'Field too long'], 422);
    $payload[$field] = $value;
}
if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) jt_json(['ok' => false, 'message' => 'Invalid email'], 422);
if ($payload['phone'] && !preg_match('/^[0-9+()\\-\\s]{6,40}$/', $payload['phone'])) jt_json(['ok' => false, 'message' => 'Invalid phone'], 422);
if (empty($input['privacy_consent'])) jt_json(['ok' => false, 'message' => 'Privacy consent is required'], 422);

$idempotencyKey = $payload['idempotency_key'] !== '' ? $payload['idempotency_key'] : jt_hash(json_encode([$payload['email'], $payload['source_url'], $payload['notes']]));
$pdo = jt_db();
$requestId = jt_random_id('inq');
$payload['request_id'] = $requestId;
$payload['received_notice'] = 'Inquiry received, reservation not confirmed.';
$payload['user_id'] = jt_current_user_id() ?: null;
$ipHash = jt_hash($_SERVER['REMOTE_ADDR'] ?? '');
$uaHash = jt_hash($_SERVER['HTTP_USER_AGENT'] ?? '');
$inserted = false;
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO inquiry (request_id, idempotency_key, payload_json, email, status, mail_status, mail_error, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $requestId,
        $idempotencyKey,
        json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $payload['email'],
        'pending',
        'pending',
        null,
        $ipHash,
        $uaHash,
        gmdate('c')
    ]);
    $pdo->commit();
    $inserted = true;
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $stmt = $pdo->prepare('SELECT request_id, mail_status FROM inquiry WHERE idempotency_key = ? LIMIT 1');
    $stmt->execute([$idempotencyKey]);
    if ($existing = $stmt->fetch()) {
        jt_json(['ok' => true, 'request_id' => $existing['request_id'], 'mail_status' => $existing['mail_status'], 'message' => 'Inquiry received, but the reservation is not confirmed yet.']);
    }
    throw $e;
}

$body = "New Japan Travel inquiry\nRequest: {$requestId}\nStatus: received_not_confirmed\n\n" . json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$mailTo = jt_env('BOOKING_TO_EMAIL', 'info@daitora-jp.com');
$mail = jt_send_mail($mailTo, 'Japan Travel inquiry ' . $requestId, $body);
$status = $mail['ok'] ? 'received_not_confirmed' : 'mail_failed';
$pdo->prepare('UPDATE inquiry SET status = ?, mail_status = ?, mail_error = ? WHERE request_id = ?')
    ->execute([$status, $mail['status'], $mail['error'], $requestId]);
jt_audit_log('inquiry_received', ['request_id' => $requestId, 'mail_status' => $mail['status']], jt_current_user_id() ?: null);
jt_json(['ok' => true, 'request_id' => $requestId, 'message' => 'Inquiry received, but the reservation is not confirmed yet.', 'mail_status' => $mail['status']]);
