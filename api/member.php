<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

jt_session_start();
$pdo = jt_db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = (string)($_GET['action'] ?? 'current');
    if ($action !== 'current') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
    $userId = jt_current_user_id();
    if (!$userId) jt_json(['ok' => true, 'member' => null]);
    $stmt = $pdo->prepare('SELECT u.id, u.email, u.referral_code, u.email_verified_at, p.nickname, p.locale, p.marketing_consent FROM member_user u LEFT JOIN member_profile p ON p.user_id = u.id WHERE u.id = ?');
    $stmt->execute([$userId]);
    jt_json(['ok' => true, 'member' => $stmt->fetch() ?: null]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
jt_require_same_origin();
jt_require_csrf();
jt_rate_limit('member_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 20, 600);

$input = jt_input();
$action = (string)($input['action'] ?? '');
$email = strtolower(trim((string)($input['email'] ?? '')));
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jt_json(['ok' => false, 'message' => 'Unable to process this request'], 422);
}

function jt_user_public(PDO $pdo, int $userId): ?array {
    $stmt = $pdo->prepare('SELECT u.id, u.email, u.referral_code, u.email_verified_at, p.nickname, p.locale, p.marketing_consent FROM member_user u LEFT JOIN member_profile p ON p.user_id = u.id WHERE u.id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function jt_require_member(): int {
    $userId = jt_current_user_id();
    if (!$userId) jt_json(['ok' => false, 'message' => 'Please sign in first'], 401);
    return $userId;
}

if ($action === 'register') {
    if ($email === '') jt_json(['ok' => false, 'message' => 'Unable to process this request'], 422);
    $password = (string)($input['password'] ?? '');
    if (!jt_valid_password($password)) jt_json(['ok' => false, 'message' => 'Password must be at least 10 characters and include letters and numbers.'], 422);
    $nickname = trim((string)($input['nickname'] ?? ''));
    if (strlen($nickname) > 80) jt_json(['ok' => false, 'message' => 'Nickname is too long'], 422);

    $stmt = $pdo->prepare('SELECT id, email_verified_at FROM member_user WHERE email = ?');
    $stmt->execute([$email]);
    $existing = $stmt->fetch();
    if ($existing && !empty($existing['email_verified_at'])) {
        jt_json(['ok' => true, 'message' => 'Please check your email to continue.']);
    }

    if ($existing) {
        $userId = (int)$existing['id'];
        $pdo->prepare('UPDATE member_user SET password_hash = ?, updated_at = ? WHERE id = ?')
            ->execute([password_hash($password, PASSWORD_DEFAULT), gmdate('c'), $userId]);
    } else {
        $ref = 'JT' . strtoupper(bin2hex(random_bytes(4)));
        $pdo->prepare('INSERT INTO member_user (email, password_hash, referral_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$email, password_hash($password, PASSWORD_DEFAULT), $ref, gmdate('c'), gmdate('c')]);
        $userId = (int)$pdo->lastInsertId();
        $pdo->prepare('INSERT INTO referral (user_id, code, status, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$userId, $ref, 'active', gmdate('c')]);
    }
    $pdo->prepare('INSERT INTO member_profile (user_id, nickname, locale, marketing_consent, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname, locale=excluded.locale, updated_at=excluded.updated_at')
        ->execute([$userId, $nickname, (string)($input['language'] ?? ''), !empty($input['marketing_consent']) ? 1 : 0, gmdate('c')]);
    $token = jt_create_token($userId, 'email_verification', 3600);
    $verifyUrl = rtrim(jt_env('SITE_URL', 'https://japan-travel.info'), '/') . '/member/verify-email/?token=' . rawurlencode($token);
    $mail = jt_send_mail($email, 'Japan Travel email verification', "Open this link to verify your Japan Travel account:\n{$verifyUrl}\n\nThis link expires in 60 minutes.");
    jt_audit_log('member_register_requested', ['email_hash' => jt_hash($email), 'mail_status' => $mail['status']], $userId);
    jt_json(['ok' => true, 'message' => $mail['ok'] ? 'Please check your email to continue.' : 'Registration was saved, but verification email is not configured.', 'mail_status' => $mail['status']]);
}

if ($action === 'verify-email') {
    $row = jt_consume_token('email_verification', trim((string)($input['token'] ?? '')));
    if (!$row) jt_json(['ok' => false, 'message' => 'Verification link is invalid or expired.'], 422);
    $pdo->prepare('UPDATE member_user SET email_verified_at = ?, updated_at = ? WHERE id = ?')
        ->execute([gmdate('c'), gmdate('c'), (int)$row['user_id']]);
    jt_audit_log('member_email_verified', [], (int)$row['user_id']);
    jt_json(['ok' => true, 'message' => 'Email verified. You can sign in now.']);
}

if ($action === 'login') {
    $stmt = $pdo->prepare('SELECT * FROM member_user WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify((string)($input['password'] ?? ''), (string)$user['password_hash'])) {
        jt_json(['ok' => false, 'message' => 'Unable to process this request'], 401);
    }
    if (empty($user['email_verified_at'])) {
        jt_json(['ok' => false, 'message' => 'Please verify your email before signing in.'], 403);
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    jt_audit_log('member_login', [], (int)$user['id']);
    jt_json(['ok' => true, 'message' => 'Signed in.', 'member' => jt_user_public($pdo, (int)$user['id'])]);
}

if ($action === 'logout') {
    $userId = jt_current_user_id();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
    jt_audit_log('member_logout', [], $userId ?: null);
    jt_json(['ok' => true, 'message' => 'Signed out.']);
}

if ($action === 'reset-password' || $action === 'reset-request') {
    if ($email !== '') {
        $stmt = $pdo->prepare('SELECT id FROM member_user WHERE email = ?');
        $stmt->execute([$email]);
        $userId = (int)($stmt->fetchColumn() ?: 0);
        if ($userId) {
            $token = jt_create_token($userId, 'password_reset', 1800);
            $url = rtrim(jt_env('SITE_URL', 'https://japan-travel.info'), '/') . '/member/reset-password/?token=' . rawurlencode($token);
            jt_send_mail($email, 'Japan Travel password reset', "Open this link to reset your password:\n{$url}\n\nThis link expires in 30 minutes.");
            jt_audit_log('member_password_reset_requested', ['email_hash' => jt_hash($email)], $userId);
        }
    }
    jt_json(['ok' => true, 'message' => 'If the account exists, the next step has been sent.']);
}

if ($action === 'reset-confirm') {
    $password = (string)($input['password'] ?? '');
    if (!jt_valid_password($password)) jt_json(['ok' => false, 'message' => 'Password must be at least 10 characters and include letters and numbers.'], 422);
    $row = jt_consume_token('password_reset', trim((string)($input['token'] ?? '')));
    if (!$row) jt_json(['ok' => false, 'message' => 'Reset link is invalid or expired.'], 422);
    $pdo->prepare('UPDATE member_user SET password_hash = ?, updated_at = ? WHERE id = ?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), gmdate('c'), (int)$row['user_id']]);
    jt_audit_log('member_password_reset_completed', [], (int)$row['user_id']);
    jt_json(['ok' => true, 'message' => 'Password updated.']);
}

if ($action === 'profile') {
    $userId = jt_require_member();
    $pdo->prepare('INSERT INTO member_profile (user_id, nickname, locale, marketing_consent, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname, locale=excluded.locale, marketing_consent=excluded.marketing_consent, updated_at=excluded.updated_at')
        ->execute([$userId, trim((string)($input['nickname'] ?? '')), (string)($input['language'] ?? ''), !empty($input['marketing_consent']) ? 1 : 0, gmdate('c')]);
    jt_audit_log('member_profile_updated', [], $userId);
    jt_json(['ok' => true, 'message' => 'Profile saved.', 'member' => jt_user_public($pdo, $userId)]);
}

if ($action === 'favorite-add' || $action === 'favorite-remove') {
    $userId = jt_require_member();
    $type = preg_replace('/[^a-z_\\-]/i', '', (string)($input['item_type'] ?? 'spot'));
    $itemId = preg_replace('/[^a-z0-9_\\-]/i', '', (string)($input['item_id'] ?? ''));
    if ($itemId === '') jt_json(['ok' => false, 'message' => 'Missing item'], 422);
    if ($action === 'favorite-add') {
        $pdo->prepare('INSERT OR IGNORE INTO favorite (user_id, item_type, item_id, created_at) VALUES (?, ?, ?, ?)')
            ->execute([$userId, $type, $itemId, gmdate('c')]);
    } else {
        $pdo->prepare('DELETE FROM favorite WHERE user_id = ? AND item_type = ? AND item_id = ?')->execute([$userId, $type, $itemId]);
    }
    jt_json(['ok' => true, 'message' => 'Favorite updated.']);
}

if ($action === 'favorite-list') {
    $userId = jt_require_member();
    $stmt = $pdo->prepare('SELECT item_type, item_id, created_at FROM favorite WHERE user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$userId]);
    jt_json(['ok' => true, 'favorites' => $stmt->fetchAll()]);
}

if ($action === 'saved-trip') {
    $userId = jt_require_member();
    $title = trim((string)($input['title'] ?? 'Kansai trip'));
    $payload = (string)($input['payload_json'] ?? '{}');
    json_decode($payload, true);
    if (json_last_error() !== JSON_ERROR_NONE) jt_json(['ok' => false, 'message' => 'Invalid trip payload'], 422);
    $pdo->prepare('INSERT INTO saved_trip (user_id, title, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        ->execute([$userId, mb_substr($title, 0, 120), $payload, gmdate('c'), gmdate('c')]);
    jt_json(['ok' => true, 'message' => 'Trip saved.']);
}

if ($action === 'saved-trip-list') {
    $userId = jt_require_member();
    $stmt = $pdo->prepare('SELECT id, title, payload_json, created_at, updated_at FROM saved_trip WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100');
    $stmt->execute([$userId]);
    jt_json(['ok' => true, 'trips' => $stmt->fetchAll()]);
}

if ($action === 'booking-reference-list') {
    $userId = jt_require_member();
    $stmt = $pdo->prepare('SELECT rezio_order_id, click_id, status, payload_json, created_at FROM booking_reference WHERE user_id = ? ORDER BY created_at DESC LIMIT 100');
    $stmt->execute([$userId]);
    jt_json(['ok' => true, 'bookings' => $stmt->fetchAll()]);
}

if ($action === 'referral-summary') {
    $userId = jt_require_member();
    $stmt = $pdo->prepare('SELECT referral_code FROM member_user WHERE id = ?');
    $stmt->execute([$userId]);
    $code = (string)$stmt->fetchColumn();
    $clickStmt = $pdo->prepare('SELECT COUNT(*) FROM referral_click WHERE ref_code = ?');
    $clickStmt->execute([$code]);
    $orderStmt = $pdo->prepare('SELECT COUNT(*) FROM booking_reference WHERE user_id = ? AND status = ?');
    $orderStmt->execute([$userId, 'valid_order']);
    jt_json(['ok' => true, 'referral' => [
        'referral_code' => $code,
        'clicks' => (int)$clickStmt->fetchColumn(),
        'valid_orders' => (int)$orderStmt->fetchColumn()
    ]]);
}

if ($action === 'vip-summary') {
    $userId = jt_require_member();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM booking_reference WHERE user_id = ? AND status = ?');
    $stmt->execute([$userId, 'valid_order']);
    $validOrders = (int)$stmt->fetchColumn();
    $tier = $validOrders >= 5 ? 'gold' : ($validOrders >= 2 ? 'silver' : 'standard');
    $historyStmt = $pdo->prepare('SELECT tier, reason, created_at FROM vip_tier_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20');
    $historyStmt->execute([$userId]);
    jt_json(['ok' => true, 'vip' => [
        'tier' => $tier,
        'valid_orders' => $validOrders,
        'history' => $historyStmt->fetchAll()
    ]]);
}

if ($action === 'ambassador-apply') {
    $userId = jt_require_member();
    $payload = json_encode(['message' => mb_substr((string)($input['message'] ?? ''), 0, 2000), 'language' => (string)($input['language'] ?? '')], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $pdo->prepare('INSERT INTO ambassador_application (user_id, status, payload_json, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$userId, 'submitted', $payload, gmdate('c')]);
    jt_audit_log('ambassador_application_submitted', [], $userId);
    jt_json(['ok' => true, 'message' => 'Application received.']);
}

if ($action === 'consent') {
    $userId = jt_current_user_id() ?: null;
    $pdo->prepare('INSERT INTO consent_record (user_id, consent_type, value, language, ip_hash, user_agent_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$userId, preg_replace('/[^a-z_\\-]/i', '', (string)($input['consent_type'] ?? 'analytics')), !empty($input['value']) ? 1 : 0, (string)($input['language'] ?? ''), jt_hash($_SERVER['REMOTE_ADDR'] ?? ''), jt_hash($_SERVER['HTTP_USER_AGENT'] ?? ''), gmdate('c')]);
    jt_json(['ok' => true, 'message' => 'Consent saved.']);
}

jt_json(['ok' => false, 'message' => 'Member feature is not active for this action'], 400);
