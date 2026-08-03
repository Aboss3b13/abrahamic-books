<?php
declare(strict_types=1);
require_once __DIR__ . '/server-common.php';

$user = ab_require_user();
$method = $_SERVER['REQUEST_METHOD'];
$directory = AB_DATA_DIRECTORY . '/shared-notes';

function shared_note_access(array $note, array $user): bool {
    return ($note['ownerUid'] ?? '') === $user['uid'] || in_array($user['email'], is_array($note['memberEmails'] ?? null) ? $note['memberEmails'] : [], true);
}

if ($method === 'GET') {
    $notes = array_values(array_filter(ab_list_json($directory . '/*.php'), static fn(array $note): bool => shared_note_access($note, $user)));
    usort($notes, static fn(array $left, array $right): int => strcmp((string) ($right['updatedAt'] ?? ''), (string) ($left['updatedAt'] ?? '')));
    ab_reply(200, ['notes' => $notes]);
}

if ($method === 'POST') {
    $note = ab_input(4194304);
    $id = bin2hex(random_bytes(12));
    $now = gmdate(DATE_ATOM);
    $members = array_values(array_unique(array_filter(array_map('ab_email', is_array($note['memberEmails'] ?? null) ? $note['memberEmails'] : []))));
    $clean = [
        'id' => $id,
        'title' => (string) ($note['title'] ?? 'Untitled shared note'),
        'text' => (string) ($note['text'] ?? ''),
        'tags' => is_array($note['tags'] ?? null) ? $note['tags'] : [],
        'references' => is_array($note['references'] ?? null) ? $note['references'] : [],
        'folderId' => (string) ($note['folderId'] ?? ''),
        'ownerUid' => $user['uid'],
        'ownerEmail' => $user['email'],
        'memberEmails' => $members,
        'createdAt' => $now,
        'updatedAt' => $now,
        'updatedBy' => $user['email'],
    ];
    if (!ab_write_json($directory . '/' . $id . '.php', $clean)) ab_reply(503, ['error' => 'Could not create the shared note.']);
    ab_reply(201, ['id' => $id]);
}

if (in_array($method, ['PUT', 'DELETE'], true)) {
    $id = ab_safe_id($_GET['id'] ?? '', 24, 24);
    $path = $directory . '/' . $id . '.php';
    $note = ab_read_json($path);
    if (!$note) ab_reply(404, ['error' => 'This shared note no longer exists.']);
    if (!shared_note_access($note, $user)) ab_reply(403, ['error' => 'You do not have access to this shared note.']);
    if ($method === 'DELETE') {
        if (($note['ownerUid'] ?? '') !== $user['uid']) ab_reply(403, ['error' => 'Only the owner can delete this shared note.']);
        unlink($path);
        ab_reply(200, ['ok' => true]);
    }
    $changes = ab_input(4194304);
    foreach (['title', 'text', 'tags', 'references', 'folderId'] as $key) if (array_key_exists($key, $changes)) $note[$key] = $changes[$key];
    if (array_key_exists('memberEmails', $changes) && ($note['ownerUid'] ?? '') === $user['uid']) {
        $note['memberEmails'] = array_values(array_unique(array_filter(array_map('ab_email', is_array($changes['memberEmails']) ? $changes['memberEmails'] : []))));
    }
    $note['updatedAt'] = gmdate(DATE_ATOM);
    $note['updatedBy'] = $user['email'];
    if (!ab_write_json($path, $note)) ab_reply(503, ['error' => 'Could not update the shared note.']);
    ab_reply(200, ['ok' => true]);
}

ab_reply(405, ['error' => 'Unsupported shared-note action.']);
