<?php
declare(strict_types=1);
require_once __DIR__ . '/server-common.php';

$action = strtolower(trim((string) ($_GET['action'] ?? '')));
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST' && in_array($action, ['register', 'login'], true)) {
    $input = ab_input(16384);
    $email = ab_email($input['email'] ?? '');
    $password = (string) ($input['password'] ?? '');
    if ($email === '' || strlen($password) < 6 || strlen($password) > 256) ab_reply(422, ['error' => 'Enter a valid email and a password of at least 6 characters.']);
    $path = ab_account_path($email);
    $account = ab_read_json($path);
    if ($action === 'register') {
        if ($account) ab_reply(409, ['error' => 'An account with this email already exists. Sign in instead.']);
        $account = [
            'uid' => bin2hex(random_bytes(16)),
            'email' => $email,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'createdAt' => gmdate(DATE_ATOM),
        ];
        if (!ab_write_json($path, $account)) ab_reply(503, ['error' => 'Could not create the account on this server.']);
    } elseif (!$account || !password_verify($password, (string) ($account['passwordHash'] ?? ''))) {
        ab_reply(401, ['error' => 'The email or password is incorrect.']);
    }
    ab_reply(200, ab_create_session($account));
}

if ($method === 'GET' && $action === 'me') {
    $user = ab_require_user();
    ab_reply(200, ['user' => ['uid' => $user['uid'], 'email' => $user['email']]]);
}

if ($method === 'POST' && $action === 'logout') {
    $user = ab_require_user();
    $path = ab_session_path($user['token']);
    if (is_file($path)) unlink($path);
    ab_reply(200, ['ok' => true]);
}

ab_reply(405, ['error' => 'Unsupported account action.']);
