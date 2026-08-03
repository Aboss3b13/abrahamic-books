<?php
declare(strict_types=1);

define('AB_DATA_DIRECTORY', getenv('AB_DATA_DIRECTORY') ?: '/var/www/html/.abrahamic-books-server');
const AB_SESSION_DAYS = 180;

function ab_headers(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Upload-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function ab_reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function ab_protect(string $payload): string {
    return "<?php http_response_code(404); exit; ?>\n" . $payload;
}

function ab_read_payload(string $path): string {
    $raw = @file_get_contents($path);
    if (!is_string($raw)) return '';
    $newline = strpos($raw, "\n");
    return $newline === false ? '' : substr($raw, $newline + 1);
}

function ab_read_json(string $path): ?array {
    $payload = ab_read_payload($path);
    $decoded = $payload === '' ? null : json_decode($payload, true);
    return is_array($decoded) ? $decoded : null;
}

function ab_write_json(string $path, array $value): bool {
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0770, true) && !is_dir($directory)) return false;
    $encoded = json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded)) return false;
    $temporary = $path . '.' . bin2hex(random_bytes(6)) . '.tmp.php';
    if (file_put_contents($temporary, ab_protect($encoded), LOCK_EX) === false) return false;
    chmod($temporary, 0660);
    return rename($temporary, $path);
}

function ab_input(int $maximumBytes = 4194304): array {
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || $raw === '' || strlen($raw) > $maximumBytes) ab_reply(400, ['error' => 'The request data is invalid or too large.']);
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) ab_reply(400, ['error' => 'The request must contain valid JSON.']);
    return $decoded;
}

function ab_email(mixed $value): string {
    $email = strtolower(trim((string) $value));
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function ab_account_path(string $email): string {
    return AB_DATA_DIRECTORY . '/accounts/' . hash('sha256', $email) . '.php';
}

function ab_session_path(string $token): string {
    return AB_DATA_DIRECTORY . '/sessions/' . hash('sha256', $token) . '.php';
}

function ab_bearer(): string {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return preg_match('/^Bearer\s+(.+)$/i', $authorization, $match) ? trim($match[1]) : '';
}

function ab_require_user(): array {
    $token = ab_bearer();
    if ($token === '') ab_reply(401, ['error' => 'Sign in to your Abrahamic Books account.']);
    $session = ab_read_json(ab_session_path($token));
    if (!$session || !hash_equals((string) ($session['tokenHash'] ?? ''), hash('sha256', $token)) || (int) ($session['expiresAt'] ?? 0) < time()) {
        ab_reply(401, ['error' => 'Your session expired. Sign in again.']);
    }
    return ['uid' => (string) $session['uid'], 'email' => (string) $session['email'], 'token' => $token];
}

function ab_create_session(array $account): array {
    $token = bin2hex(random_bytes(32));
    $session = [
        'uid' => (string) $account['uid'],
        'email' => (string) $account['email'],
        'tokenHash' => hash('sha256', $token),
        'createdAt' => time(),
        'expiresAt' => time() + AB_SESSION_DAYS * 86400,
    ];
    if (!ab_write_json(ab_session_path($token), $session)) ab_reply(503, ['error' => 'Could not create a secure session.']);
    return ['token' => $token, 'user' => ['uid' => $session['uid'], 'email' => $session['email']]];
}

function ab_user_directory(string $uid): string {
    return AB_DATA_DIRECTORY . '/users/' . preg_replace('/[^a-f0-9]/', '', strtolower($uid));
}

function ab_safe_id(mixed $value, int $minimum = 8, int $maximum = 160): string {
    $id = trim((string) $value);
    if (strlen($id) < $minimum || strlen($id) > $maximum || !preg_match('/^[A-Za-z0-9:_-]+$/', $id)) ab_reply(400, ['error' => 'The requested item ID is invalid.']);
    return $id;
}

function ab_list_json(string $pattern): array {
    $items = [];
    foreach (glob($pattern) ?: [] as $path) {
        $value = ab_read_json($path);
        if ($value) $items[] = $value;
    }
    return $items;
}

ab_headers();
