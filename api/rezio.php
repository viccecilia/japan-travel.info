<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') jt_json(['ok' => false, 'message' => 'Method not allowed'], 405);
$language = strtolower((string)($_GET['language'] ?? 'ja'));
if (!in_array($language, ['ja', 'en', 'zh-cn', 'zh-tw', 'ko'], true)) $language = 'ja';
header('Cache-Control: no-store');
header('Location: /' . $language . '/contact/', true, 302);
exit;
