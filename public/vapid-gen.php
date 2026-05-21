<?php
/**
 * VAPID Key Generator — esegui una sola volta, poi elimina questo file dal server!
 * Visita: https://tuosito.com/app/sp3s4/vapid-gen.php
 */

header('Content-Type: text/plain; charset=utf-8');

// Genera coppia di chiavi EC P-256
$config = [
    'curve_name'       => 'prime256v1',
    'private_key_type' => OPENSSL_KEYTYPE_EC,
];
$key = openssl_pkey_new($config);
if (!$key) {
    die('Errore: OpenSSL non supporta EC P-256 su questo server.');
}

// Estrai chiave privata in PEM
openssl_pkey_export($key, $privatePem);

// Estrai chiave pubblica
$details = openssl_pkey_get_details($key);
$publicPem = $details['key'];

// Converti chiave pubblica in formato non-compresso (0x04 + x + y) → base64url
// Il PEM della chiave pubblica EC contiene la chiave DER, estrai il punto
$pubDer = base64_decode(implode('', array_slice(explode("\n", trim($publicPem)), 1, -1)));
// L'ultimo 65 byte del DER è il punto non-compresso (04 || x || y)
$pubPoint = substr($pubDer, -65);
$publicKeyBase64 = rtrim(strtr(base64_encode($pubPoint), '+/', '-_'), '=');

// Converti chiave privata in formato raw 32 byte → base64url
$privDer = base64_decode(implode('', array_slice(explode("\n", trim($privatePem)), 1, -1)));
// Nel DER EC privkey, il valore privato è 32 byte dopo alcuni header
// Cerca il tag 0x04 (OCTET STRING) che contiene il valore privato
$pos = strpos($privDer, "\x04\x20");
if ($pos !== false) {
    $privRaw = substr($privDer, $pos + 2, 32);
} else {
    // fallback: cerca sequenza alternativa
    $pos = strpos($privDer, "\x04\x1f");
    $privRaw = $pos !== false ? "\x00" . substr($privDer, $pos + 2, 31) : substr($privDer, -32);
}
$privateKeyBase64 = rtrim(strtr(base64_encode($privRaw), '+/', '-_'), '=');

echo "=== CHIAVI VAPID GENERATE ===\n\n";
echo "Copia questi valori in push.php\n\n";
echo "VAPID_PUBLIC_KEY = " . $publicKeyBase64 . "\n\n";
echo "VAPID_PRIVATE_KEY = " . $privateKeyBase64 . "\n\n";
echo "VAPID_PRIVATE_PEM:\n" . $privatePem . "\n";
echo "\n⚠️  ELIMINA QUESTO FILE DAL SERVER DOPO AVER COPIATO LE CHIAVI!\n";
