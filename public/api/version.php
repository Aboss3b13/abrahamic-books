<?php
declare(strict_types=1);
require_once __DIR__ . '/server-common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') ab_reply(405, ['error' => 'Method not allowed.']);
$apk = dirname(__DIR__) . '/downloads/abrahamic-books-offline.apk';
ab_reply(200, [
    'versionCode' => 23,
    'versionName' => '1.17.2',
    'apkUrl' => 'https://abbas2.ali-raza.net/AbrahamicBooks/downloads/abrahamic-books-offline.apk',
    'apkSha256' => is_file($apk) ? hash_file('sha256', $apk) : '',
    'message' => 'A new Abrahamic Books update is available.',
]);
