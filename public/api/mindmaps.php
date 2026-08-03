<?php
declare(strict_types=1);

const FIREBASE_API_KEY = 'AIzaSyDcZTfjyNPnbGCBdO6HvPSLttQsrOZYx-E';
const SHARE_DIRECTORY = '/var/www/html/.abrahamic-books-shares';
const MAX_SHARE_BYTES = 900000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function reply(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function bearerToken(): string {
    $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    return preg_match('/^Bearer\s+(.+)$/i', $authorization, $match) ? trim($match[1]) : '';
}

function firebaseUser(bool $required): ?array {
    $token = bearerToken();
    if ($token === '') {
        if ($required) reply(401, ['error' => 'Sign in to share or open this private mind map.']);
        return null;
    }
    $request = curl_init('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . FIREBASE_API_KEY);
    curl_setopt_array($request, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['idToken' => $token]),
    ]);
    $response = curl_exec($request);
    $status = (int) curl_getinfo($request, CURLINFO_HTTP_CODE);
    curl_close($request);
    $decoded = is_string($response) ? json_decode($response, true) : null;
    $user = is_array($decoded) ? ($decoded['users'][0] ?? null) : null;
    if ($status !== 200 || !is_array($user) || empty($user['localId'])) {
        if ($required) reply(401, ['error' => 'Your sign-in expired. Sign in again and retry.']);
        return null;
    }
    return ['uid' => (string) $user['localId'], 'email' => strtolower((string) ($user['email'] ?? ''))];
}

function sharePath(string $id): string {
    return SHARE_DIRECTORY . '/' . $id . '.php';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = firebaseUser(true);
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || $raw === '' || strlen($raw) > MAX_SHARE_BYTES) {
        reply(413, ['error' => 'This map is too large to share at once.']);
    }
    $map = json_decode($raw, true);
    if (!is_array($map) || !is_array($map['notes'] ?? null) || count($map['notes']) < 1 || count($map['notes']) > 60) {
        reply(422, ['error' => 'This mind map does not contain valid notes.']);
    }
    $mode = ($map['accessMode'] ?? '') === 'custom' ? 'custom' : 'link';
    $members = array_values(array_unique(array_filter(array_map(
        static fn($email): string => strtolower(trim((string) $email)),
        is_array($map['memberEmails'] ?? null) ? $map['memberEmails'] : []
    ))));
    if ($mode === 'custom' && count($members) < 1) reply(422, ['error' => 'Add at least one email address.']);
    $map['accessMode'] = $mode;
    $map['memberEmails'] = $members;
    $map['ownerUid'] = $user['uid'];
    $map['ownerEmail'] = $user['email'];
    $map['createdAt'] = gmdate(DATE_ATOM);
    $map['updatedAt'] = $map['createdAt'];
    $encoded = json_encode($map, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || strlen($encoded) > MAX_SHARE_BYTES) reply(413, ['error' => 'This map is too large to share at once.']);
    if (!is_dir(SHARE_DIRECTORY) || !is_writable(SHARE_DIRECTORY)) reply(503, ['error' => 'The sharing service is temporarily unavailable.']);
    do { $id = bin2hex(random_bytes(9)); } while (is_file(sharePath($id)));
    $protected = "<?php http_response_code(404); exit; ?>\n" . $encoded;
    if (file_put_contents(sharePath($id), $protected, LOCK_EX) === false) reply(503, ['error' => 'Could not save this shared mind map.']);
    reply(201, ['id' => $id]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $id = strtolower(trim((string) ($_GET['id'] ?? '')));
    if (!preg_match('/^[a-f0-9]{18}$/', $id)) reply(400, ['error' => 'This mind map link is invalid.']);
    $path = sharePath($id);
    if (!is_file($path)) reply(404, ['error' => 'This shared mind map is no longer available.']);
    $raw = file_get_contents($path);
    $payload = is_string($raw) ? substr($raw, strpos($raw, "\n") + 1) : '';
    $map = $payload !== '' ? json_decode($payload, true) : null;
    if (!is_array($map)) reply(500, ['error' => 'This shared mind map could not be read.']);
    if (($map['accessMode'] ?? 'link') === 'custom') {
        $user = firebaseUser(true);
        $members = is_array($map['memberEmails'] ?? null) ? $map['memberEmails'] : [];
        if ($user['uid'] !== ($map['ownerUid'] ?? '') && !in_array($user['email'], $members, true)) {
            reply(403, ['error' => 'This private mind map was not shared with your email address.']);
        }
    }
    $map['id'] = $id;
    reply(200, $map);
}

reply(405, ['error' => 'Method not allowed.']);
