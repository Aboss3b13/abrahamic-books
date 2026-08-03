<?php
declare(strict_types=1);
require_once __DIR__ . '/server-common.php';

$user = ab_require_user();
$action = strtolower(trim((string) ($_GET['action'] ?? '')));
$method = $_SERVER['REQUEST_METHOD'];
$userDirectory = ab_user_directory($user['uid']);

if ($method === 'GET' && $action === 'notes') {
    ab_reply(200, ['notes' => ab_list_json($userDirectory . '/notes/*.php')]);
}

if ($method === 'POST' && $action === 'note') {
    $note = ab_input(4194304);
    $key = trim((string) ($note['key'] ?? ''));
    if ($key === '' || strlen($key) > 1000) ab_reply(422, ['error' => 'This note is missing its storage key.']);
    $note['key'] = $key;
    $note['ownerUid'] = $user['uid'];
    $note['ownerEmail'] = $user['email'];
    $path = $userDirectory . '/notes/' . hash('sha256', $key) . '.php';
    if (!ab_write_json($path, $note)) ab_reply(503, ['error' => 'Could not save this note on the server.']);
    ab_reply(200, ['ok' => true]);
}

if ($action === 'organizer') {
    $path = $userDirectory . '/organizer.php';
    if ($method === 'GET') ab_reply(200, ['organizer' => ab_read_json($path)]);
    if ($method === 'POST') {
        $organizer = ab_input(4194304);
        if (!ab_write_json($path, $organizer)) ab_reply(503, ['error' => 'Could not save folders on the server.']);
        ab_reply(200, ['ok' => true]);
    }
}

if ($action === 'last-read') {
    $path = $userDirectory . '/last-read.php';
    if ($method === 'GET') ab_reply(200, ['lastRead' => ab_read_json($path)]);
    if ($method === 'POST') {
        $value = ab_input(65536);
        if (!ab_write_json($path, $value)) ab_reply(503, ['error' => 'Could not save reading progress.']);
        ab_reply(200, ['ok' => true]);
    }
}

ab_reply(405, ['error' => 'Unsupported sync action.']);
