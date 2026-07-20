<?php
declare(strict_types=1);

function jt_env(string $key, string $default = ''): string {
    $value = getenv($key);
    return $value === false ? $default : trim((string)$value);
}

function jt_is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function jt_is_production(): bool {
    return strtolower(jt_env('APP_ENV', 'development')) === 'production';
}

function jt_json(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jt_app_secret(): string {
    $appKey = jt_env('APP_SECRET');
    $bad = ['', 'development-only-change-me', 'change-me', 'secret', 'changeme'];
    if (jt_is_production() && (in_array($appKey, $bad, true) || strlen($appKey) < 32)) {
        jt_json(['ok' => false, 'message' => 'Server configuration error'], 500);
    }
    return $appKey !== '' ? $appKey : 'development-only-change-me';
}

function jt_hash(string $value): string {
    return hash_hmac('sha256', $value, jt_app_secret());
}

function jt_random_id(string $prefix): string {
    return $prefix . '_' . bin2hex(random_bytes(16));
}

function jt_data_dir(): string {
    $configured = jt_env('APP_DATA_DIR');
    if (jt_is_production() && $configured === '') {
        jt_json(['ok' => false, 'message' => 'APP_DATA_DIR is required'], 500);
    }
    $dir = $configured !== '' ? $configured : dirname(__DIR__) . '/runtime/private';
    if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
        jt_json(['ok' => false, 'message' => 'Unable to create data directory'], 500);
    }
    $realRoot = realpath(dirname(__DIR__));
    $realDir = realpath($dir);
    if ($realRoot && $realDir && str_starts_with($realDir, $realRoot . DIRECTORY_SEPARATOR)
        && !str_contains($realDir, DIRECTORY_SEPARATOR . 'runtime' . DIRECTORY_SEPARATOR . 'private')) {
        jt_json(['ok' => false, 'message' => 'Unsafe APP_DATA_DIR'], 500);
    }
    return $dir;
}

function jt_db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $pdo = new PDO('sqlite:' . jt_data_dir() . '/japan_travel.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');
    jt_migrate($pdo);
    return $pdo;
}

function jt_col_exists(PDO $pdo, string $table, string $column): bool {
    foreach ($pdo->query('PRAGMA table_info(' . $table . ')') as $row) {
        if (($row['name'] ?? '') === $column) return true;
    }
    return false;
}

function jt_add_col(PDO $pdo, string $table, string $column, string $definition): void {
    if (!jt_col_exists($pdo, $table, $column)) {
        $pdo->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
    }
}

function jt_migrate(PDO $pdo): void {
    $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migration (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
    )');
    $pdo->beginTransaction();
    try {
        $pdo->exec('CREATE TABLE IF NOT EXISTS inquiry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id TEXT UNIQUE NOT NULL,
            idempotency_key TEXT UNIQUE,
            payload_json TEXT NOT NULL,
            email TEXT,
            status TEXT NOT NULL,
            mail_status TEXT NOT NULL,
            mail_error TEXT,
            ip_hash TEXT,
            user_agent_hash TEXT,
            created_at TEXT NOT NULL
        )');
        jt_add_col($pdo, 'inquiry', 'idempotency_key', 'TEXT');
        jt_add_col($pdo, 'inquiry', 'mail_error', 'TEXT');
        $pdo->exec('CREATE TABLE IF NOT EXISTS member_user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            referral_code TEXT UNIQUE,
            email_verified_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS member_profile (
            user_id INTEGER PRIMARY KEY,
            nickname TEXT,
            locale TEXT,
            marketing_consent INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS token_hash (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            purpose TEXT NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used_at TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS favorite (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, item_type, item_id),
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS saved_trip (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS booking_reference (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            rezio_order_id TEXT,
            click_id TEXT,
            status TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(rezio_order_id),
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE SET NULL
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS referral (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT UNIQUE NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS referral_click (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            referral_code TEXT,
            click_id TEXT,
            landing_page TEXT,
            ip_hash TEXT,
            user_agent_hash TEXT,
            created_at TEXT NOT NULL,
            UNIQUE(click_id)
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS vip_tier_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tier TEXT NOT NULL,
            reason TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE CASCADE
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS ambassador_application (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            status TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE SET NULL
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS consent_record (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            consent_type TEXT NOT NULL,
            value INTEGER NOT NULL,
            language TEXT,
            ip_hash TEXT,
            user_agent_hash TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE SET NULL
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS rezio_click (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            click_id TEXT UNIQUE NOT NULL,
            visitor_id TEXT,
            user_id INTEGER,
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
            destination_url TEXT,
            ip_hash TEXT,
            user_agent_hash TEXT,
            clicked_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES member_user(id) ON DELETE SET NULL
        )');
        jt_add_col($pdo, 'rezio_click', 'destination_url', 'TEXT');
        $pdo->exec('CREATE TABLE IF NOT EXISTS rezio_order (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rezio_order_id TEXT UNIQUE NOT NULL,
            email TEXT,
            referral_code TEXT,
            click_id TEXT,
            status TEXT NOT NULL,
            paid_status TEXT NOT NULL,
            amount TEXT,
            currency TEXT,
            service_completed_at TEXT,
            imported_hash TEXT NOT NULL,
            imported_at TEXT NOT NULL
        )');
        jt_add_col($pdo, 'rezio_order', 'click_id', 'TEXT');
        jt_add_col($pdo, 'rezio_order', 'amount', 'TEXT');
        jt_add_col($pdo, 'rezio_order', 'currency', 'TEXT');
        $pdo->exec('CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            user_id INTEGER,
            payload_json TEXT NOT NULL,
            ip_hash TEXT,
            user_agent_hash TEXT,
            created_at TEXT NOT NULL
        )');
        jt_add_col($pdo, 'audit_log', 'user_id', 'INTEGER');
        jt_add_col($pdo, 'audit_log', 'ip_hash', 'TEXT');
        jt_add_col($pdo, 'audit_log', 'user_agent_hash', 'TEXT');
        foreach ([
            'CREATE INDEX IF NOT EXISTS idx_token_lookup ON token_hash(purpose, token_hash, used_at, expires_at)',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_token_hash_unique ON token_hash(token_hash)',
            'CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiry_idempotency ON inquiry(idempotency_key) WHERE idempotency_key IS NOT NULL',
            'CREATE INDEX IF NOT EXISTS idx_favorite_user ON favorite(user_id, item_type)',
            'CREATE INDEX IF NOT EXISTS idx_rezio_click_product ON rezio_click(product_key, clicked_at)',
            'CREATE INDEX IF NOT EXISTS idx_rezio_order_ref ON rezio_order(referral_code, status, paid_status)',
            'CREATE INDEX IF NOT EXISTS idx_inquiry_created ON inquiry(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(event_type, created_at)'
        ] as $sql) $pdo->exec($sql);
        $pdo->exec('INSERT OR IGNORE INTO schema_migration (version, applied_at) VALUES (3, ' . $pdo->quote(gmdate('c')) . ')');
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function jt_session_start(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name(jt_env('SESSION_COOKIE_NAME', 'jt_session'));
    session_set_cookie_params([
        'httponly' => true,
        'secure' => jt_is_https(),
        'samesite' => 'Lax',
        'path' => '/'
    ]);
    session_start();
}

function jt_current_user_id(): int {
    jt_session_start();
    return (int)($_SESSION['user_id'] ?? 0);
}

function jt_host_allowed(string $host): bool {
    $allowed = array_filter(array_map('trim', explode(',', jt_env('ALLOWED_ORIGINS', ''))));
    $siteHost = parse_url(jt_env('SITE_URL', 'https://japan-travel.info'), PHP_URL_HOST);
    if ($siteHost) $allowed[] = strtolower($siteHost);
    $allowed[] = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    return in_array(strtolower($host), array_unique($allowed), true);
}

function jt_require_same_origin(): void {
    foreach (['HTTP_ORIGIN', 'HTTP_REFERER'] as $key) {
        $value = (string)($_SERVER[$key] ?? '');
        if ($value === '') continue;
        $host = parse_url($value, PHP_URL_HOST);
        if (!$host || !jt_host_allowed($host)) jt_json(['ok' => false, 'message' => 'Request origin is not allowed'], 403);
        return;
    }
    if (jt_is_production()) jt_json(['ok' => false, 'message' => 'Request origin is required'], 403);
}

function jt_csrf_token(): string {
    jt_session_start();
    if (empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return (string)$_SESSION['csrf_token'];
}

function jt_require_csrf(): void {
    jt_session_start();
    $token = (string)($_POST['csrf_token'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''));
    if ($token === '' || empty($_SESSION['csrf_token']) || !hash_equals((string)$_SESSION['csrf_token'], $token)) {
        jt_json(['ok' => false, 'message' => 'Security token expired. Please reload and try again.'], 419);
    }
}

function jt_input(): array {
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (str_contains($type, 'application/json')) {
        $data = json_decode((string)file_get_contents('php://input'), true);
        return is_array($data) ? $data : [];
    }
    return $_POST;
}

function jt_rate_limit(string $key, int $limit = 8, int $window = 600): void {
    $file = jt_data_dir() . '/rate_' . preg_replace('/[^a-z0-9_\\-]/i', '_', $key) . '.json';
    $now = time();
    $items = is_file($file) ? json_decode((string)file_get_contents($file), true) : [];
    $items = array_values(array_filter(is_array($items) ? $items : [], fn($t) => is_int($t) && $t > $now - $window));
    if (count($items) >= $limit) jt_json(['ok' => false, 'message' => 'Too many requests'], 429);
    $items[] = $now;
    file_put_contents($file, json_encode($items), LOCK_EX);
}

function jt_audit_log(string $event, array $payload = [], ?int $userId = null): void {
    try {
        jt_db()->prepare('INSERT INTO audit_log (event_type, user_id, payload_json, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$event, $userId, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), jt_hash($_SERVER['REMOTE_ADDR'] ?? ''), jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''), gmdate('c')]);
    } catch (Throwable) {
        // Audit logging must not leak internal errors to visitors.
    }
}

function jt_mail_status(string $status, string $error = ''): array {
    return ['ok' => in_array($status, ['sent', 'spooled'], true), 'status' => $status, 'error' => $error];
}

function jt_smtp_send(string $to, string $subject, string $body): array {
    $host = jt_env('SMTP_HOST');
    $port = (int)jt_env('SMTP_PORT', '587');
    $user = jt_env('SMTP_USER');
    $pass = jt_env('SMTP_PASSWORD');
    $from = jt_env('MAIL_FROM', 'no-reply@japan-travel.info');
    if ($host === '' || $user === '' || $pass === '' || $from === '') return jt_mail_status('failed', 'SMTP is not configured');
    $remote = ($port === 465 ? 'ssl://' : '') . $host . ':' . $port;
    $fp = @stream_socket_client($remote, $errno, $errstr, 15);
    if (!$fp) return jt_mail_status('failed', 'SMTP connection failed');
    $read = fn() => (string)fgets($fp, 2048);
    $cmd = function (string $line) use ($fp, $read): string {
        fwrite($fp, $line . "\r\n");
        $out = '';
        do {
            $chunk = $read();
            $out .= $chunk;
        } while (isset($chunk[3]) && $chunk[3] === '-');
        return $out;
    };
    $read();
    $cmd('EHLO japan-travel.info');
    if ($port !== 465 && jt_env('SMTP_TLS', '1') !== '0') {
        $cmd('STARTTLS');
        stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        $cmd('EHLO japan-travel.info');
    }
    $cmd('AUTH LOGIN');
    $cmd(base64_encode($user));
    $cmd(base64_encode($pass));
    $cmd('MAIL FROM:<' . $from . '>');
    $cmd('RCPT TO:<' . $to . '>');
    $cmd('DATA');
    $headers = [
        'From: Japan Travel <' . $from . '>',
        'To: <' . $to . '>',
        'Subject: ' . mb_encode_mimeheader($subject, 'UTF-8'),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit'
    ];
    $result = $cmd(implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n.", "\n..", $body) . "\r\n.");
    $cmd('QUIT');
    fclose($fp);
    return str_starts_with($result, '250') ? jt_mail_status('sent') : jt_mail_status('failed', 'SMTP DATA failed');
}

function jt_send_mail(string $to, string $subject, string $body): array {
    $from = jt_env('MAIL_FROM', 'no-reply@japan-travel.info');
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || str_contains($subject, "\n") || str_contains($from, "\n")) {
        return jt_mail_status('failed', 'Invalid mail envelope');
    }
    $transport = strtolower(jt_env('MAIL_TRANSPORT', jt_is_production() ? 'smtp' : 'spool'));
    if ($transport === 'smtp') return jt_smtp_send($to, $subject, $body);
    if ($transport === 'mail') {
        $ok = @mail($to, $subject, $body, 'From: ' . $from);
        return $ok ? jt_mail_status('sent') : jt_mail_status('failed', 'mail() failed');
    }
    if ($transport === 'spool' && !jt_is_production()) {
        $spool = jt_data_dir() . '/mail_spool';
        if (!is_dir($spool)) mkdir($spool, 0700, true);
        $ok = file_put_contents($spool . '/' . jt_random_id('mail') . '.txt', "TO: {$to}\nSUBJECT: {$subject}\n\n{$body}", LOCK_EX) !== false;
        return $ok ? jt_mail_status('spooled') : jt_mail_status('failed', 'spool write failed');
    }
    return jt_mail_status('failed', 'Mail transport is not configured');
}

function jt_create_token(int $userId, string $purpose, int $ttlSeconds): string {
    $token = bin2hex(random_bytes(32));
    jt_db()->prepare('INSERT INTO token_hash (user_id, purpose, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$userId, $purpose, jt_hash($token), gmdate('c', time() + $ttlSeconds), gmdate('c')]);
    return $token;
}

function jt_consume_token(string $purpose, string $token): ?array {
    if ($token === '') return null;
    $pdo = jt_db();
    $stmt = $pdo->prepare('SELECT * FROM token_hash WHERE purpose = ? AND token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1');
    $stmt->execute([$purpose, jt_hash($token), gmdate('c')]);
    $row = $stmt->fetch();
    if (!$row) return null;
    $pdo->prepare('UPDATE token_hash SET used_at = ? WHERE id = ?')->execute([gmdate('c'), $row['id']]);
    return $row;
}

function jt_valid_password(string $password): bool {
    return strlen($password) >= 10 && preg_match('/[A-Za-z]/', $password) && preg_match('/[0-9]/', $password);
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
        $scheme = parse_url($url, PHP_URL_SCHEME);
        return $scheme === 'https' && $host && preg_match('/(^|\\.)rezio\\.(io|com|shop)$/i', $host);
    });
}

function jt_url_with_query(string $url, array $params): string {
    $parts = parse_url($url);
    $query = [];
    if (!empty($parts['query'])) parse_str($parts['query'], $query);
    foreach ($params as $key => $value) {
        if ($value !== '' && $value !== null) $query[$key] = $value;
    }
    $base = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');
    if (isset($parts['port'])) $base .= ':' . $parts['port'];
    $base .= $parts['path'] ?? '';
    return $base . ($query ? '?' . http_build_query($query) : '') . (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');
}

function jt_same_origin_return(string $url): string {
    if ($url === '') return '/';
    $site = rtrim(jt_env('SITE_URL', 'https://japan-travel.info'), '/');
    if (str_starts_with($url, '/')) return $url;
    return str_starts_with($url, $site) ? $url : '/';
}
