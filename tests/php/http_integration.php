<?php
declare(strict_types=1);

$base = rtrim($argv[1] ?? 'http://127.0.0.1:8099', '/');
$cookieFile = sys_get_temp_dir() . '/jt_cookie_' . bin2hex(random_bytes(4)) . '.txt';
$cookieJar = [];

function ok(bool $condition, string $message): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$message}\n");
        exit(1);
    }
}
function request(string $method, string $url, array $fields = [], array $headers = []): array {
    global $cookieFile, $cookieJar;
    $headerLines = array_merge(['Origin: http://127.0.0.1:8099'], $headers);
    $opts = [
        'http' => [
            'method' => $method,
            'ignore_errors' => true,
            'header' => implode("\r\n", $headerLines) . "\r\n"
        ]
    ];
    if ($method === 'POST') {
        $opts['http']['content'] = http_build_query($fields);
        $opts['http']['header'] .= "Content-Type: application/x-www-form-urlencoded\r\n";
    }
    if ($cookieJar) {
        $pairs = [];
        foreach ($cookieJar as $name => $value) $pairs[] = $name . '=' . $value;
        $opts['http']['header'] .= "Cookie: " . implode('; ', $pairs) . "\r\n";
    }
    $body = file_get_contents($url, false, stream_context_create($opts));
    $status = 0;
    $cookies = [];
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('/^HTTP\/\S+\s+(\d+)/', $line, $m)) $status = (int)$m[1];
        if (stripos($line, 'Set-Cookie:') === 0) {
            $pair = explode(';', trim(substr($line, 11)), 2)[0];
            [$name, $value] = array_pad(explode('=', $pair, 2), 2, '');
            if ($name !== '') $cookieJar[$name] = $value;
            $cookies[] = $pair;
        }
    }
    if ($cookieJar) {
        $pairs = [];
        foreach ($cookieJar as $name => $value) $pairs[] = $name . '=' . $value;
        file_put_contents($cookieFile, implode('; ', $pairs));
    }
    return [$status, json_decode((string)$body, true) ?: [], (string)$body, $http_response_header ?? []];
}

[$status, $csrf] = request('GET', $base . '/api/csrf.php');
ok($status === 200 && !empty($csrf['csrf_token']), 'csrf endpoint works');
$token = $csrf['csrf_token'];
$email = 'http-' . bin2hex(random_bytes(3)) . '@example.com';

[$status, $reg] = request('POST', $base . '/api/member.php', [
    'csrf_token' => $token,
    'action' => 'register',
    'email' => $email,
    'password' => 'Password1234',
    'nickname' => 'HTTP User',
    'language' => 'en'
]);
ok($status === 200 && !empty($reg['ok']), 'member register over HTTP');

[$status, $loginBlocked] = request('POST', $base . '/api/member.php', [
    'csrf_token' => $token,
    'action' => 'login',
    'email' => $email,
    'password' => 'Password1234'
]);
ok($status === 403, 'unverified login is blocked');

$db = new PDO('sqlite:' . getenv('APP_DATA_DIR') . '/japan_travel.sqlite');
$db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$stmt = $db->prepare('SELECT token_hash FROM token_hash th JOIN member_user u ON u.id = th.user_id WHERE u.email = ? AND purpose = ? ORDER BY th.id DESC LIMIT 1');
$stmt->execute([$email, 'email_verification']);
ok((bool)$stmt->fetch(), 'verification token stored hashed');
$db->prepare('UPDATE member_user SET email_verified_at = ? WHERE email = ?')->execute([gmdate('c'), $email]);

[$status, $login] = request('POST', $base . '/api/member.php', [
    'csrf_token' => $token,
    'action' => 'login',
    'email' => $email,
    'password' => 'Password1234'
]);
ok($status === 200 && !empty($login['member']['id']), 'verified member login works');

[$status, $csrf] = request('GET', $base . '/api/csrf.php');
ok($status === 200 && !empty($csrf['csrf_token']), 'csrf refresh after login works');
$token = $csrf['csrf_token'];

[$status, $ref] = request('POST', $base . '/api/member.php', [
    'csrf_token' => $token,
    'action' => 'referral-summary'
]);
ok($status === 200 && isset($ref['referral']['clicks']), 'referral-summary callable over HTTP');

[$status, $reset] = request('POST', $base . '/api/member.php', [
    'csrf_token' => $token,
    'action' => 'reset-request',
    'email' => $email
]);
ok($status === 200 && !empty($reset['ok']), 'password reset request works');

$idem = 'idem_' . bin2hex(random_bytes(4));
$inquiry = [
    'csrf_token' => $token,
    'idempotency_key' => $idem,
    'name' => 'HTTP User',
    'email' => $email,
    'privacy_consent' => '1',
    'notes' => 'test inquiry'
];
[$status, $inq1] = request('POST', $base . '/api/inquiry.php', $inquiry);
[$status2, $inq2] = request('POST', $base . '/api/inquiry.php', $inquiry);
ok($status === 200 && $status2 === 200 && $inq1['request_id'] === $inq2['request_id'], 'inquiry idempotency over HTTP');

[$status, $body, $raw, $headers] = request('GET', $base . '/api/rezio.php?product_key=kyoto&utm_source=instagram&utm_medium=social&ref_code=JTSELF&language=en&visitor_id=vis_http');
$location = implode("\n", $headers);
ok($status === 302 && str_contains($location, 'click_id=clk_') && str_contains($location, 'utm_source=instagram'), 'Rezio redirect appends click attribution');

echo "OK php HTTP integration\n";
