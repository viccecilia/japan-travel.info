<?php
declare(strict_types=1);

function jt_env(string $key, string $default = ''): string {
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function jt_data_dir(): string {
    $dir = jt_env('APP_DATA_DIR', dirname(__DIR__) . '/runtime/private');
    $realRoot = realpath(dirname(__DIR__));
    $realDir = realpath($dir);
    if ($realDir !== false && $realRoot !== false && str_starts_with($realDir, $realRoot . DIRECTORY_SEPARATOR) && !str_contains($realDir, DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'private')) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'message' => 'Unsafe APP_DATA_DIR']);
        exit;
    }
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir;
}

function jt_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $pdo = new PDO('sqlite:' . jt_data_dir() . '/japan_travel.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    jt_migrate($pdo);
    return $pdo;
}

function jt_migrate(PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS inquiry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT UNIQUE NOT NULL,
        payload_json TEXT NOT NULL,
        email TEXT,
        status TEXT NOT NULL,
        mail_status TEXT NOT NULL,
        ip_hash TEXT,
        user_agent_hash TEXT,
        created_at TEXT NOT NULL
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS rezio_click (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        click_id TEXT UNIQUE NOT NULL,
        visitor_id TEXT,
        user_id TEXT,
        ref_code TEXT,
        product_key TEXT NOT NULL,
        language TEXT,
        landing_page TEXT,
        source_page TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        destination_url_key TEXT,
        ip_hash TEXT,
        user_agent_hash TEXT,
        clicked_at TEXT NOT NULL
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS member_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        referral_code TEXT UNIQUE,
        email_verified_at TEXT,
        created_at TEXT NOT NULL
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS token_hash (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        purpose TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS rezio_order (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rezio_order_id TEXT UNIQUE NOT NULL,
        email TEXT,
        referral_code TEXT,
        status TEXT NOT NULL,
        paid_status TEXT NOT NULL,
        service_completed_at TEXT,
        imported_hash TEXT NOT NULL,
        imported_at TEXT NOT NULL
    )');
    $pdo->exec('CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
    )');
}

function jt_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jt_hash(string $value): string {
    $secret = jt_env('APP_SECRET', 'development-only-change-me');
    return hash_hmac('sha256', $value, $secret);
}

function jt_random_id(string $prefix): string {
    return $prefix . '_' . bin2hex(random_bytes(16));
}

function jt_rate_limit(string $key, int $limit = 8, int $window = 600): void {
    $file = jt_data_dir() . '/rate_' . preg_replace('/[^a-z0-9_\\-]/i', '_', $key) . '.json';
    $now = time();
    $items = is_file($file) ? json_decode((string)file_get_contents($file), true) : [];
    $items = array_values(array_filter(is_array($items) ? $items : [], fn($t) => $t > $now - $window));
    if (count($items) >= $limit) jt_json(['ok' => false, 'message' => 'Too many requests'], 429);
    $items[] = $now;
    file_put_contents($file, json_encode($items), LOCK_EX);
}

function jt_send_mail(string $subject, string $body): bool {
    $to = jt_env('BOOKING_TO_EMAIL', 'info@daitora-jp.com');
    $from = jt_env('MAIL_FROM', 'no-reply@japan-travel.info');
    if (str_contains($subject, "\n") || str_contains($from, "\n") || str_contains($to, "\n")) return false;
    if (jt_env('MAIL_TRANSPORT') === 'mail') {
        return @mail($to, $subject, $body, 'From: ' . $from);
    }
    $spool = jt_data_dir() . '/mail_spool';
    if (!is_dir($spool)) mkdir($spool, 0700, true);
    return file_put_contents($spool . '/' . jt_random_id('mail') . '.txt', "TO: {$to}\nSUBJECT: {$subject}\n\n{$body}", LOCK_EX) !== false;
}

function jt_allowed_rezio_urls(): array {
    $urls = [];
    foreach (['REZIO_ROUTE_URLS_JSON', 'REZIO_PRODUCT_URLS_JSON'] as $key) {
        $decoded = json_decode(jt_env($key, '{}'), true);
        if (is_array($decoded)) $urls = array_merge($urls, $decoded);
    }
    $default = jt_env('REZIO_DEFAULT_URL');
    if ($default) $urls['default'] = $default;
    return array_filter($urls, function ($url) {
        if (!is_string($url)) return false;
        $host = parse_url($url, PHP_URL_HOST);
        return $host && preg_match('/(^|\\.)rezio\\.(io|com)$/i', $host);
    });
}

function jt_same_origin_return(string $url): string {
    if ($url === '') return '/';
    $site = rtrim(jt_env('SITE_URL', 'https://japan-travel.info'), '/');
    if (str_starts_with($url, '/')) return $url;
    return str_starts_with($url, $site) ? $url : '/';
}
