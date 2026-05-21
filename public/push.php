<?php
/**
 * Spesa App — Web Push Backend
 * Gestisce subscription e invio notifiche push.
 *
 * PRIMA DI USARE: genera le chiavi con vapid-gen.php e sostituisci i valori sotto.
 */

// ── CONFIGURAZIONE ─────────────────────────────────────────────────────────────

// Sostituisci con i valori generati da vapid-gen.php
define('VAPID_PUBLIC_KEY',  'BLUIpjWVJ_wJNHMSmBRfSHX25cV0c69Jz0N7c_zxsyl3P-Xt2g8dAqtNpykdtuDZ6e4OgKsrtY6fNVLPJPPiRI4');
define('VAPID_PRIVATE_PEM', '-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQggFrOHYDvb7DiKfzY
qWHrEc9sKyn6u4yvKXBhRjZgihuhRANCAAS1CKY1lSf8CTRzEpgUX0h19uXFdHOv
Sc9De3P88bMpdz/l7doPHQKrTacpHbbg2enuDoCrK7WOnzVSzyTz4kSO
-----END PRIVATE KEY-----');
define('VAPID_SUBJECT',     'mailto:emanuelemancini@me.com');

// File di storage
define('SUBSCRIPTIONS_FILE', __DIR__ . '/spesa_subscriptions.json');
define('SENT_LOG_FILE',      __DIR__ . '/spesa_push_sent.json');

// ── HELPERS ────────────────────────────────────────────────────────────────────

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function b64url($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function b64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}
function json_response($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}
function read_json($file, $default = []) {
    if (!file_exists($file)) return $default;
    $data = json_decode(file_get_contents($file), true);
    return $data !== null ? $data : $default;
}
function write_json($file, $data) {
    file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT), LOCK_EX);
}

// ── VAPID JWT ──────────────────────────────────────────────────────────────────

function make_vapid_jwt($audience) {
    $header  = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $payload = b64url(json_encode([
        'aud' => $audience,
        'exp' => time() + 43200,
        'sub' => VAPID_SUBJECT,
    ]));

    $signing_input = "$header.$payload";

    // Firma con ECDSA P-256 (SHA-256)
    $pkey = openssl_pkey_get_private(VAPID_PRIVATE_PEM);
    openssl_sign($signing_input, $der_sig, $pkey, OPENSSL_ALGO_SHA256);

    // Converti firma DER → raw r||s (64 byte) per JWT ES256
    $raw_sig = der_to_raw_sig($der_sig);

    return "$signing_input." . b64url($raw_sig);
}

function der_to_raw_sig($der) {
    // DER: 0x30 [total_len] 0x02 [r_len] [r] 0x02 [s_len] [s]
    $offset = 2; // salta 0x30 e lunghezza totale
    $offset++; // salta 0x02
    $r_len   = ord($der[$offset++]);
    $r       = substr($der, $offset, $r_len);
    $offset += $r_len;
    $offset++; // salta 0x02
    $s_len   = ord($der[$offset++]);
    $s       = substr($der, $offset, $s_len);

    // Normalizza a 32 byte ciascuno (rimuovi padding 0x00, aggiungi se corto)
    $r = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);

    return $r . $s;
}

// ── INVIO PUSH ─────────────────────────────────────────────────────────────────

function send_push($subscription, $payload_array) {
    $endpoint = $subscription['endpoint'];
    $p256dh   = $subscription['keys']['p256dh'] ?? '';
    $auth     = $subscription['keys']['auth']   ?? '';

    // Ricava l'audience (origin) dall'endpoint
    $parts    = parse_url($endpoint);
    $audience = $parts['scheme'] . '://' . $parts['host'];

    $jwt        = make_vapid_jwt($audience);
    $public_key = VAPID_PUBLIC_KEY;

    $body    = '';
    $headers = [
        'Authorization: vapid t=' . $jwt . ',k=' . $public_key,
        'TTL: 86400',
        'Urgency: normal',
    ];

    // Se abbiamo chiavi del dispositivo, cifra il payload
    if ($p256dh && $auth && !empty($payload_array)) {
        $encrypted = encrypt_push_payload(json_encode($payload_array), $p256dh, $auth);
        if ($encrypted) {
            $body      = $encrypted['ciphertext'];
            $headers[] = 'Content-Type: application/octet-stream';
            $headers[] = 'Content-Encoding: aes128gcm';
            $headers[] = 'Content-Length: ' . strlen($body);
        }
    } else {
        $headers[] = 'Content-Length: 0';
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);

    $response  = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $http_code >= 200 && $http_code < 300;
}

// ── CIFRATURA PAYLOAD (RFC 8291 / aes128gcm) ──────────────────────────────────

function encrypt_push_payload($plaintext, $p256dh_b64, $auth_b64) {
    if (!function_exists('openssl_pkey_new')) return null;

    $receiver_pub = b64url_decode($p256dh_b64);
    $auth_secret  = b64url_decode($auth_b64);

    // Genera coppia di chiavi effimera
    $ephemeral = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$ephemeral) return null;

    $details      = openssl_pkey_get_details($ephemeral);
    $eph_pub_der  = base64_decode(implode('', array_slice(explode("\n", trim($details['key'])), 1, -1)));
    $eph_pub_raw  = substr($eph_pub_der, -65); // 04 || x || y

    // Ricostruisci chiave pubblica del ricevitore come risorsa OpenSSL
    $receiver_key = openssl_pkey_get_public(
        "-----BEGIN PUBLIC KEY-----\n" .
        chunk_split(base64_encode(
            // SubjectPublicKeyInfo wrapper per P-256
            "\x30\x59\x30\x13\x06\x07\x2a\x86\x48\xce\x3d\x02\x01" .
            "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\x03\x42\x00" .
            $receiver_pub
        ), 64, "\n") .
        "-----END PUBLIC KEY-----"
    );
    if (!$receiver_key) return null;

    // ECDH: shared secret
    openssl_pkey_export($ephemeral, $eph_priv_pem);
    $eph_priv_res = openssl_pkey_get_private($eph_priv_pem);
    // openssl_dh_compute_key non funziona per EC direttamente in PHP < 8
    // Usiamo openssl_pkey_derive se disponibile (PHP 7.3+)
    if (function_exists('openssl_pkey_derive')) {
        $shared_secret = openssl_pkey_derive($receiver_key, $eph_priv_res, 32);
    } else {
        return null; // fallback: invia push senza payload
    }
    if (!$shared_secret) return null;

    // HKDF per derivare le chiavi (RFC 8291)
    $salt = random_bytes(16);

    // ikm = HKDF-Extract(auth_secret, shared_secret || receiver_pub || eph_pub_raw || "WebPush: info\x00")
    $ikm_info = "WebPush: info\x00" . $receiver_pub . $eph_pub_raw;
    $ikm      = hkdf($auth_secret, $shared_secret, $ikm_info, 32);

    $cek  = hkdf($salt, $ikm, "Content-Encoding: aes128gcm\x00", 16);
    $nonce= hkdf($salt, $ikm, "Content-Encoding: nonce\x00", 12);

    // Padding minimo (1 byte delimitatore 0x02)
    $padded = $plaintext . "\x02";

    // Cifra con AES-128-GCM
    $tag        = '';
    $ciphertext = openssl_encrypt($padded, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($ciphertext === false) return null;

    // Costruisci il record aes128gcm: salt(16) + rs(4) + keyid_len(1) + keyid + ciphertext + tag
    $rs     = pack('N', 4096); // record size
    $keyid  = $eph_pub_raw;
    $record = $salt . $rs . chr(strlen($keyid)) . $keyid . $ciphertext . $tag;

    return ['ciphertext' => $record];
}

function hkdf($salt, $ikm, $info, $length) {
    // Extract
    $prk = hash_hmac('sha256', $ikm, $salt, true);
    // Expand
    $t   = '';
    $okm = '';
    for ($i = 1; strlen($okm) < $length; $i++) {
        $t    = hash_hmac('sha256', $t . $info . chr($i), $prk, true);
        $okm .= $t;
    }
    return substr($okm, 0, $length);
}

// ── CONTROLLO PRODOTTI IN SCADENZA ─────────────────────────────────────────────

function check_and_push($state) {
    $products = $state['products'] ?? [];
    $now      = time();
    $tomorrow = $now + 86400;
    $in2days  = $now + 172800;

    $sent_log = read_json(SENT_LOG_FILE, []);
    $today    = date('Y-m-d');

    $notifications = [];

    foreach ($products as $p) {
        if (empty($p['expiryDate'])) continue;
        $exp  = strtotime($p['expiryDate']);
        $name = $p['name'] ?? 'Prodotto';
        $id   = $p['id']   ?? '';

        // Già scaduto
        if ($exp < $now) {
            $key = "expired-$id-$today";
            if (!isset($sent_log[$key])) {
                $notifications[] = [
                    'title' => '⚠️ Prodotto scaduto',
                    'body'  => "$name è scaduto! Controlla la dispensa.",
                    'tag'   => "expired-$id",
                ];
                $sent_log[$key] = time();
            }
        }
        // Scade entro domani
        elseif ($exp <= $tomorrow) {
            $key = "expiring-today-$id-$today";
            if (!isset($sent_log[$key])) {
                $notifications[] = [
                    'title' => '🕐 Scade oggi!',
                    'body'  => "$name scade oggi. Consumalo al più presto!",
                    'tag'   => "expiring-$id",
                ];
                $sent_log[$key] = time();
            }
        }
        // Scade entro 2 giorni
        elseif ($exp <= $in2days) {
            $key = "expiring-soon-$id-$today";
            if (!isset($sent_log[$key])) {
                $notifications[] = [
                    'title' => '📅 In scadenza domani',
                    'body'  => "$name scade domani.",
                    'tag'   => "expiring-$id",
                ];
                $sent_log[$key] = time();
            }
        }
    }

    // Pulisci log vecchio (> 3 giorni)
    foreach (array_keys($sent_log) as $k) {
        if ($sent_log[$k] < $now - 259200) unset($sent_log[$k]);
    }
    write_json(SENT_LOG_FILE, $sent_log);

    if (empty($notifications)) return 0;

    $subscriptions = read_json(SUBSCRIPTIONS_FILE, []);
    $sent = 0;
    $dead = [];

    foreach ($subscriptions as $idx => $sub) {
        foreach ($notifications as $notif) {
            $ok = send_push($sub, $notif);
            if (!$ok) { $dead[] = $idx; break; }
            else $sent++;
        }
    }

    // Rimuovi subscription non più valide
    if (!empty($dead)) {
        foreach (array_unique($dead) as $d) unset($subscriptions[$d]);
        write_json(SUBSCRIPTIONS_FILE, array_values($subscriptions));
    }

    return $sent;
}

// ── ROUTER ─────────────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Salva subscription
if ($method === 'POST' && $action === 'subscribe') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (empty($body['endpoint'])) {
        json_response(['error' => 'Subscription non valida'], 400);
    }

    $subs = read_json(SUBSCRIPTIONS_FILE, []);

    // Evita duplicati
    foreach ($subs as $s) {
        if ($s['endpoint'] === $body['endpoint']) {
            json_response(['ok' => true, 'message' => 'Già registrata']);
        }
    }

    $subs[] = $body;
    write_json(SUBSCRIPTIONS_FILE, $subs);
    json_response(['ok' => true, 'message' => 'Subscription salvata']);
}

// Elimina subscription
if ($method === 'POST' && $action === 'unsubscribe') {
    $body = json_decode(file_get_contents('php://input'), true);
    $endpoint = $body['endpoint'] ?? '';

    $subs = read_json(SUBSCRIPTIONS_FILE, []);
    $subs = array_values(array_filter($subs, function ($s) use ($endpoint) {
        return $s['endpoint'] !== $endpoint;
    }));
    write_json(SUBSCRIPTIONS_FILE, $subs);
    json_response(['ok' => true]);
}

// Invia chiave pubblica VAPID al frontend
if ($method === 'GET' && $action === 'vapid-key') {
    json_response(['publicKey' => VAPID_PUBLIC_KEY]);
}

// Test — invia notifica di prova
if ($method === 'POST' && $action === 'test') {
    $subs = read_json(SUBSCRIPTIONS_FILE, []);
    if (empty($subs)) {
        json_response(['error' => 'Nessuna subscription registrata'], 400);
    }
    $ok = send_push($subs[0], [
        'title' => '✅ Test riuscito!',
        'body'  => 'Le notifiche push di Spesa App funzionano.',
        'tag'   => 'test',
    ]);
    json_response(['ok' => $ok]);
}

// Chiamata dal sync — controlla prodotti e invia push
if ($method === 'POST' && $action === 'check') {
    $body  = json_decode(file_get_contents('php://input'), true);
    $state = $body['state'] ?? $body ?? [];
    $sent  = check_and_push($state);
    json_response(['ok' => true, 'sent' => $sent]);
}

json_response(['error' => 'Azione non valida'], 400);
