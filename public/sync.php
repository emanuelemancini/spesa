<?php
/**
 * Spesa App - Script di Sincronizzazione e Backup (v1.0)
 * Gestisce: Sync Cloud, Auto-Backup (4h), Rotazione ultimi 10 backup.
 */

header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dataFile  = __DIR__ . '/spesa_data.json';
$backupDir = __DIR__ . '/spesa_backups';

// --- DIAGNOSTICA ---
if (isset($_GET['action']) && $_GET['action'] === 'test') {
    echo json_encode([
        'status'      => 'diagnostic',
        'php_version' => phpversion(),
        'server_time' => date('Y-m-d H:i:s'),
        'permissions' => [
            'directory_writable'  => is_writable(__DIR__),
            'data_file_writable'  => file_exists($dataFile) ? is_writable($dataFile) : is_writable(__DIR__),
            'backup_dir_writable' => is_writable($backupDir)
        ],
        'files' => [
            'data_exists'   => file_exists($dataFile),
            'data_size'     => file_exists($dataFile) ? filesize($dataFile) : 0,
            'backups_count' => count(glob($backupDir . '/*.json'))
        ]
    ]);
    exit();
}

if (!file_exists($backupDir)) {
    @mkdir($backupDir, 0777, true);
}

// --- LISTA BACKUPS ---
if (isset($_GET['action']) && $_GET['action'] === 'list_backups') {
    $backups = [];
    if (file_exists($backupDir)) {
        $files = glob($backupDir . '/backup_*.json');
        foreach ($files as $file) {
            $backups[] = [
                'filename'  => basename($file),
                'timestamp' => filemtime($file),
                'date'      => date('d/m/Y H:i', filemtime($file)),
                'size'      => filesize($file)
            ];
        }
        usort($backups, function($a, $b) { return $b['timestamp'] - $a['timestamp']; });
    }
    echo json_encode(['status' => 'success', 'backups' => $backups]);
    exit();
}

// --- RESTORE BACKUP ---
if (isset($_GET['action']) && $_GET['action'] === 'restore_backup' && isset($_GET['file'])) {
    $target = $backupDir . '/' . basename($_GET['file']);
    if (file_exists($target)) {
        echo file_get_contents($target);
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'File non trovato.']);
    }
    exit();
}

// --- DELETE BACKUP ---
if (isset($_GET['action']) && $_GET['action'] === 'delete_backup' && isset($_GET['file'])) {
    $target = $backupDir . '/' . basename($_GET['file']);
    if (file_exists($target)) {
        echo @unlink($target)
            ? json_encode(['status' => 'success', 'message' => 'Backup eliminato.'])
            : (http_response_code(500) && json_encode(['status' => 'error', 'message' => 'Impossibile eliminare.']));
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'File non trovato.']);
    }
    exit();
}

// --- MANUAL BACKUP ---
if (isset($_GET['action']) && $_GET['action'] === 'manual_backup') {
    if (file_exists($dataFile)) {
        $newFile = $backupDir . '/backup_MANUALE_' . date('Ymd_Hi') . '.json';
        if (copy($dataFile, $newFile)) {
            echo json_encode(['status' => 'success', 'filename' => basename($newFile)]);
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Errore creazione backup.']);
        }
    } else {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'Nessun dato da salvare.']);
    }
    exit();
}

// --- POST: Salva dati ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input   = file_get_contents('php://input');
    $payload = json_decode($input, true);

    if (!$payload || empty($payload['data']) || strlen($payload['data']) < 10) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Payload non valido.']);
        exit();
    }

    $saveData = [
        'data'        => $payload['data'],
        'lastUpdated' => $payload['lastUpdated'] ?? (time() * 1000)
    ];

    $bytes = @file_put_contents($dataFile, json_encode($saveData, JSON_PRETTY_PRINT), LOCK_EX);

    if ($bytes !== false && $bytes > 0) {
        // Auto-backup ogni 4 ore, max 10
        $now           = time();
        $interval      = 4 * 60 * 60;
        $files         = glob($backupDir . '/backup_*.json') ?: [];
        $lastBackupTime = 0;
        foreach ($files as $f) $lastBackupTime = max($lastBackupTime, filemtime($f));

        if (empty($files) || ($now - $lastBackupTime) > $interval) {
            $newBackup = $backupDir . '/backup_' . date('Ymd_Hi') . '.json';
            @copy($dataFile, $newBackup);
            $files = glob($backupDir . '/backup_*.json') ?: [];
            usort($files, function($a, $b) { return filemtime($b) - filemtime($a); });
            for ($i = 10; $i < count($files); $i++) @unlink($files[$i]);
        }

        echo json_encode(['status' => 'success', 'lastUpdated' => $saveData['lastUpdated']]);
    } else {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Errore scrittura file.']);
    }
    exit();
}

// --- GET: Leggi dati ---
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo file_exists($dataFile)
        ? file_get_contents($dataFile)
        : json_encode(['data' => '', 'lastUpdated' => 0]);
}
?>
