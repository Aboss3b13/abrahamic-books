<?php
declare(strict_types=1);
require_once __DIR__ . '/server-common.php';

define('SHARE_DIRECTORY', getenv('AB_SHARE_DIRECTORY') ?: '/var/www/html/.abrahamic-books-shares');
const MAX_CHUNK_BYTES = 524288;
const MAX_CHUNKS = 10000;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Upload-Token');
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

function safeId(): string {
    $id = strtolower(trim((string) ($_GET['id'] ?? '')));
    if (!preg_match('/^[a-f0-9]{18}$/', $id)) reply(400, ['error' => 'This mind map link is invalid.']);
    return $id;
}

function sharePath(string $id): string { return SHARE_DIRECTORY . '/' . $id . '.php'; }
function uploadPath(string $id): string { return SHARE_DIRECTORY . '/' . $id . '.upload.php'; }
function chunkPath(string $id, int $index): string { return SHARE_DIRECTORY . '/' . $id . '.' . $index . '.part.php'; }

function protect(string $payload): string { return "<?php http_response_code(404); exit; ?>\n" . $payload; }

function readProtected(string $path): string {
    $raw = file_get_contents($path);
    if (!is_string($raw)) return '';
    $newline = strpos($raw, "\n");
    return $newline === false ? '' : substr($raw, $newline + 1);
}

function readUpload(string $id): array {
    $payload = readProtected(uploadPath($id));
    $upload = $payload !== '' ? json_decode($payload, true) : null;
    if (!is_array($upload)) reply(404, ['error' => 'This upload is no longer available.']);
    return $upload;
}

function verifyUploadToken(array $upload): void {
    $supplied = (string) ($_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '');
    if ($supplied === '' || !hash_equals((string) ($upload['uploadToken'] ?? ''), $supplied)) {
        reply(403, ['error' => 'This upload link is not valid.']);
    }
}

function enforceMapAccess(array $access): void {
    if (($access['accessMode'] ?? 'link') !== 'custom') return;
    $user = ab_require_user();
    $members = is_array($access['memberEmails'] ?? null) ? $access['memberEmails'] : [];
    if ($user['uid'] !== ($access['ownerUid'] ?? '') && $user['email'] !== ($access['ownerEmail'] ?? '') && !in_array($user['email'], $members, true)) {
        reply(403, ['error' => 'This private mind map was not shared with your email address.']);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$action = strtolower(trim((string) ($_GET['action'] ?? '')));

if ($method === 'POST' && $action === 'start') {
    $user = ab_require_user();
    $raw = file_get_contents('php://input');
    $request = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($request)) reply(400, ['error' => 'The upload information is invalid.']);
    $totalBytes = (int) ($request['totalBytes'] ?? 0);
    $totalChunks = (int) ($request['totalChunks'] ?? 0);
    if ($totalBytes < 2 || $totalChunks < 1 || $totalChunks > MAX_CHUNKS || $totalBytes > $totalChunks * MAX_CHUNK_BYTES) {
        reply(422, ['error' => 'The mind-map upload size is invalid.']);
    }
    $mode = ($request['accessMode'] ?? '') === 'custom' ? 'custom' : 'link';
    $members = array_values(array_unique(array_filter(array_map(
        static fn($email): string => strtolower(trim((string) $email)),
        is_array($request['memberEmails'] ?? null) ? $request['memberEmails'] : []
    ))));
    if ($mode === 'custom' && count($members) < 1) reply(422, ['error' => 'Add at least one email address.']);
    if (!is_dir(SHARE_DIRECTORY) || !is_writable(SHARE_DIRECTORY)) reply(503, ['error' => 'The sharing service is temporarily unavailable.']);
    do { $id = bin2hex(random_bytes(9)); } while (is_file(uploadPath($id)) || is_file(sharePath($id)));
    $uploadToken = bin2hex(random_bytes(24));
    $upload = [
        'id' => $id,
        'uploadToken' => $uploadToken,
        'totalBytes' => $totalBytes,
        'totalChunks' => $totalChunks,
        'accessMode' => $mode,
        'memberEmails' => $members,
        'ownerUid' => $user['uid'],
        'ownerEmail' => $user['email'],
        'createdAt' => gmdate(DATE_ATOM),
        'complete' => false,
    ];
    $encoded = json_encode($upload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || file_put_contents(uploadPath($id), protect($encoded), LOCK_EX) === false) {
        reply(503, ['error' => 'Could not start this upload.']);
    }
    reply(201, ['id' => $id, 'uploadToken' => $uploadToken]);
}

if ($method === 'POST' && $action === 'chunk') {
    $id = safeId();
    $upload = readUpload($id);
    verifyUploadToken($upload);
    if (!empty($upload['complete'])) reply(409, ['error' => 'This upload is already complete.']);
    $index = filter_var($_GET['index'] ?? null, FILTER_VALIDATE_INT);
    if ($index === false || $index < 0 || $index >= (int) $upload['totalChunks']) reply(400, ['error' => 'The upload part number is invalid.']);
    $raw = file_get_contents('php://input');
    if (!is_string($raw) || $raw === '' || strlen($raw) > MAX_CHUNK_BYTES) reply(413, ['error' => 'This upload part is too large.']);
    if (file_put_contents(chunkPath($id, $index), protect($raw), LOCK_EX) === false) reply(503, ['error' => 'Could not save this upload part.']);
    reply(200, ['received' => $index]);
}

if ($method === 'POST' && $action === 'finish') {
    $id = safeId();
    $upload = readUpload($id);
    verifyUploadToken($upload);
    $receivedBytes = 0;
    for ($index = 0; $index < (int) $upload['totalChunks']; $index++) {
        $path = chunkPath($id, $index);
        if (!is_file($path)) reply(409, ['error' => 'One or more upload parts are missing.']);
        $receivedBytes += strlen(readProtected($path));
    }
    if ($receivedBytes !== (int) $upload['totalBytes']) reply(409, ['error' => 'The uploaded map is incomplete.']);
    $upload['complete'] = true;
    $upload['completedAt'] = gmdate(DATE_ATOM);
    $encoded = json_encode($upload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded) || file_put_contents(uploadPath($id), protect($encoded), LOCK_EX) === false) reply(503, ['error' => 'Could not finish this upload.']);
    reply(201, ['id' => $id]);
}

if ($method === 'GET') {
    $id = safeId();
    $legacyPath = sharePath($id);
    if (is_file($legacyPath)) {
        $payload = readProtected($legacyPath);
        $map = $payload !== '' ? json_decode($payload, true) : null;
        if (!is_array($map)) reply(500, ['error' => 'This shared mind map could not be read.']);
        enforceMapAccess($map);
        $map['id'] = $id;
        reply(200, $map);
    }
    $upload = readUpload($id);
    if (empty($upload['complete'])) reply(404, ['error' => 'This shared mind map is not ready yet.']);
    enforceMapAccess($upload);
    http_response_code(200);
    for ($index = 0; $index < (int) $upload['totalChunks']; $index++) {
        $payload = readProtected(chunkPath($id, $index));
        if ($payload === '') exit;
        echo $payload;
    }
    exit;
}

reply(405, ['error' => 'Method not allowed.']);
