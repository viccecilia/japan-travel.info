<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
jt_session_start();
jt_require_same_origin();
jt_require_csrf();
jt_rate_limit('inquiry_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 8, 600);

$input = jt_input();
$language = strtolower(trim((string)($input['language'] ?? 'en')));
if (!in_array($language, ['ja', 'en', 'zh-cn', 'zh-tw', 'ko'], true)) $language = 'en';
$messages = [
    'ja' => ['invalid' => '入力内容をご確認ください。', 'failed' => '送信できませんでした。入力内容を残したまま、後でもう一度お試しください。', 'sent' => 'お問い合わせを受け付けました。送信した時点では予約確定ではありません。担当者からの返信をもって受付となります。'],
    'en' => ['invalid' => 'Please check the information you entered.', 'failed' => 'We could not send your inquiry. Your entries have been kept; please try again later.', 'sent' => 'Your inquiry has been sent. This does not confirm a booking; it is accepted only after our team replies.'],
    'zh-cn' => ['invalid' => '请检查填写内容。', 'failed' => '咨询暂时无法发送。已保留填写内容，请稍后重试。', 'sent' => '咨询已发送。提交表单并不代表预约成功，工作人员确认并回复后才算正式受理。'],
    'zh-tw' => ['invalid' => '請檢查填寫內容。', 'failed' => '諮詢暫時無法傳送。已保留填寫內容，請稍後再試。', 'sent' => '諮詢已傳送。提交表單並不代表預約成功，工作人員確認並回覆後才算正式受理。'],
    'ko' => ['invalid' => '입력 내용을 확인해 주세요.', 'failed' => '문의를 전송하지 못했습니다. 입력 내용은 유지되며 잠시 후 다시 시도해 주세요.', 'sent' => '문의가 전송되었습니다. 제출만으로 예약이 확정되지 않으며, 담당자의 회신 후 접수됩니다.']
][$language];

if (!empty($input['website'] ?? '')) jt_json(['ok' => true, 'message' => $messages['sent']]);

$limits = [
    'name' => 100, 'email' => 254, 'phone' => 40, 'contact_method' => 20,
    'service_type' => 40, 'travel_date' => 10, 'travel_time' => 5,
    'flight_number' => 40, 'pickup_location' => 300, 'dropoff_location' => 300,
    'passenger_count' => 3, 'luggage_count' => 3, 'vehicle_preference' => 120,
    'itinerary' => 4000, 'source_url' => 500, 'idempotency_key' => 100,
    'visitor_id' => 120, 'ref_code' => 100, 'landing_page' => 500,
    'utm_source' => 120, 'utm_medium' => 120, 'utm_campaign' => 120, 'utm_content' => 120
];
$payload = ['language' => $language];
foreach ($limits as $field => $max) {
    $value = trim((string)($input[$field] ?? ''));
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($length > $max || preg_match('/[\r\n]/', $value) && in_array($field, ['email','phone','contact_method','flight_number'], true)) {
        jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
    }
    $payload[$field] = $value;
}

$required = ['name','email','service_type','pickup_location','dropoff_location','itinerary'];
foreach ($required as $field) if ($payload[$field] === '') jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if (!filter_var($payload['email'], FILTER_VALIDATE_EMAIL)) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if ($payload['phone'] !== '' && !preg_match('/^[0-9+()\-\s]{6,40}$/', $payload['phone'])) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if (!in_array($payload['contact_method'], ['email','phone','line','wechat','whatsapp'], true)) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if (!in_array($payload['service_type'], ['airport_transfer','private_charter','day_route','custom','other'], true)) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if ($payload['travel_date'] !== '') {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $payload['travel_date']);
    if (!$date || $date->format('Y-m-d') !== $payload['travel_date']) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
}
if ($payload['travel_time'] !== '' && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $payload['travel_time'])) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
foreach (['passenger_count','luggage_count'] as $field) {
    if ($payload[$field] !== '' && (!ctype_digit($payload[$field]) || (int)$payload[$field] > 999)) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
}
if ($payload['source_url'] !== '' && (!filter_var($payload['source_url'], FILTER_VALIDATE_URL) || !in_array(parse_url($payload['source_url'], PHP_URL_SCHEME), ['http','https'], true))) {
    jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
}
if ($payload['landing_page'] !== '' && (!str_starts_with($payload['landing_page'], '/') || str_contains($payload['landing_page'], "\n") || str_contains($payload['landing_page'], "\r"))) {
    jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
}
if ($payload['visitor_id'] !== '' && !preg_match('/^[A-Za-z0-9_-]{1,120}$/', $payload['visitor_id'])) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if ($payload['ref_code'] !== '' && !preg_match('/^[A-Za-z0-9_-]{1,100}$/', $payload['ref_code'])) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);
if (empty($input['privacy_consent'])) jt_json(['ok' => false, 'message' => $messages['invalid']], 422);

$idempotencyKey = $payload['idempotency_key'] !== '' ? $payload['idempotency_key'] : jt_hash(json_encode([$payload['email'], $payload['source_url'], $payload['itinerary']]));
$pdo = jt_db();
$requestId = jt_random_id('inq');
$payload['request_id'] = $requestId;
$payload['user_id'] = jt_current_user_id() ?: null;

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('INSERT INTO inquiry (request_id, idempotency_key, payload_json, email, status, mail_status, mail_error, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$requestId, $idempotencyKey, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $payload['email'], 'pending', 'pending', null, jt_hash($_SERVER['REMOTE_ADDR'] ?? ''), jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''), gmdate('c')]);
    $pdo->commit();
} catch (PDOException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $stmt = $pdo->prepare('SELECT request_id, mail_status FROM inquiry WHERE idempotency_key = ? LIMIT 1');
    $stmt->execute([$idempotencyKey]);
    $existing = $stmt->fetch();
    if ($existing && $existing['mail_status'] === 'sent') jt_json(['ok' => true, 'request_id' => $existing['request_id'], 'message' => $messages['sent']]);
    if ($existing) jt_json(['ok' => false, 'request_id' => $existing['request_id'], 'message' => $messages['failed']], 409);
    throw $error;
}

$delivery = jt_forward_group_contact($payload);
$status = $delivery['ok'] ? 'received_not_confirmed' : 'mail_failed';
$pdo->prepare('UPDATE inquiry SET status = ?, mail_status = ?, mail_error = ? WHERE request_id = ?')
    ->execute([$status, $delivery['status'], $delivery['error'], $requestId]);
jt_audit_log('inquiry_received', ['request_id' => $requestId, 'mail_status' => $delivery['status']], jt_current_user_id() ?: null);
if (!$delivery['ok']) jt_json(['ok' => false, 'request_id' => $requestId, 'message' => $messages['failed']], 502);
jt_json(['ok' => true, 'request_id' => $requestId, 'message' => $messages['sent']]);
