<?php
declare(strict_types=1);

$tmp = sys_get_temp_dir() . '/jt_smtp_test_' . bin2hex(random_bytes(4));
putenv('APP_ENV=development');
putenv('APP_DATA_DIR=' . $tmp);
putenv('APP_SECRET=test-secret-with-more-than-thirty-two-characters');
putenv('MAIL_TRANSPORT=smtp');
putenv('SMTP_HOST=127.0.0.1');
putenv('SMTP_PORT=2525');
putenv('SMTP_TLS=0');
putenv('SMTP_USER=test-user');
putenv('SMTP_PASSWORD=test-password');
putenv('MAIL_FROM=no-reply@japan-travel.info');
require dirname(__DIR__, 2) . '/api/bootstrap.php';

$result = jt_send_mail('receiver@example.com', 'SMTP test', 'hello');
if (($result['status'] ?? '') !== 'sent') {
    fwrite(STDERR, 'FAIL: SMTP send failed with status ' . ($result['status'] ?? 'missing') . "\n");
    exit(1);
}
echo "OK SMTP integration\n";
