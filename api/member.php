<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

session_name(jt_env('SESSION_COOKIE_NAME', 'jt_session'));
session_set_cookie_params(['httponly' => true, 'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), 'samesite' => 'Lax', 'path' => '/']);
session_start();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
jt_rate_limit('member_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 600);

$action = (string)($_POST['action'] ?? '');
$email = strtolower(trim((string)($_POST['email'] ?? '')));
if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) jt_json(['ok' => false, 'message' => 'Unable to process this request'], 422);
$pdo = jt_db();

if ($action === 'register') {
    $password = (string)($_POST['password'] ?? '');
    if (strlen($password) < 8) jt_json(['ok' => false, 'message' => 'Unable to process this request'], 422);
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $ref = 'JT' . strtoupper(bin2hex(random_bytes(4)));
    $stmt = $pdo->prepare('INSERT OR IGNORE INTO member_user (email, password_hash, referral_code, created_at) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $hash, $ref, gmdate('c')]);
    $userId = (int)$pdo->lastInsertId();
    if ($userId > 0) {
        $token = bin2hex(random_bytes(24));
        $pdo->prepare('INSERT INTO token_hash (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?)')
            ->execute([$userId, 'email_verification', jt_hash($token), gmdate('c', time() + 3600)]);
        jt_send_mail('Japan Travel email verification', 'Please verify your email. Token is not logged by the server response.');
    }
    jt_json(['ok' => true, 'message' => 'Please check your email to continue.']);
}

if ($action === 'login') {
    $stmt = $pdo->prepare('SELECT * FROM member_user WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user || !password_verify((string)($_POST['password'] ?? ''), (string)$user['password_hash'])) {
        jt_json(['ok' => false, 'message' => 'Unable to process this request'], 401);
    }
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    jt_json(['ok' => true, 'message' => 'Signed in.']);
}

if ($action === 'reset-password') {
    if ($email) {
        $stmt = $pdo->prepare('SELECT id FROM member_user WHERE email = ?');
        $stmt->execute([$email]);
        $userId = (int)($stmt->fetchColumn() ?: 0);
        if ($userId) {
            $token = bin2hex(random_bytes(24));
            $pdo->prepare('INSERT INTO token_hash (user_id, purpose, token_hash, expires_at) VALUES (?, ?, ?, ?)')
                ->execute([$userId, 'password_reset', jt_hash($token), gmdate('c', time() + 1800)]);
            jt_send_mail('Japan Travel password reset', 'A reset request was received. Raw token is never written to logs.');
        }
    }
    jt_json(['ok' => true, 'message' => 'If the account exists, the next step has been sent.']);
}

jt_json(['ok' => false, 'message' => 'Member feature is not active for this action'], 400);
