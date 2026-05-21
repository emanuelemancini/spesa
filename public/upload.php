<?php
header('Content-Type: application/json');

$uploadDir = __DIR__ . '/images/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['image'])) {
    echo json_encode(['error' => 'Nessuna immagine ricevuta']);
    exit;
}

$imageData = $input['image'];

// Rimuovi il prefisso data:image/...;base64,
if (!preg_match('/^data:image\/(\w+);base64,/', $imageData, $matches)) {
    echo json_encode(['error' => 'Formato immagine non valido']);
    exit;
}

$ext      = strtolower($matches[1]) === 'png' ? 'png' : 'jpg';
$raw      = base64_decode(substr($imageData, strpos($imageData, ',') + 1));

if ($raw === false) {
    echo json_encode(['error' => 'Decodifica base64 fallita']);
    exit;
}

$filename = 'img_' . uniqid('', true) . '.' . $ext;
$filepath = $uploadDir . $filename;

if (file_put_contents($filepath, $raw) === false) {
    echo json_encode(['error' => 'Impossibile salvare il file']);
    exit;
}

// Costruisci URL assoluto
$proto   = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host    = $_SERVER['HTTP_HOST'];
$dir     = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$url     = $proto . '://' . $host . $dir . '/images/' . $filename;

echo json_encode(['url' => $url]);
