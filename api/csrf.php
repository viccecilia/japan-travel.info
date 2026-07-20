<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

header('Cache-Control: no-store');
jt_json(['ok' => true, 'csrf_token' => jt_csrf_token()]);
