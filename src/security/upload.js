/**
 * Carica un'immagine (base64 data URL) sul server e restituisce l'URL pubblico.
 * Su localhost restituisce null (si usa il base64 direttamente in memoria).
 */

const getBase = () => {
    const base = window.__SPESA_BASE__ || '/'
    return base.endsWith('/') ? base : base + '/'
}

const isLocalhost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname)

export const uploadImage = async (base64DataUrl) => {
    if (isLocalhost()) return null  // in locale usa base64 direttamente

    try {
        const res = await fetch(getBase() + 'upload.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64DataUrl })
        })
        if (res.ok) {
            const data = await res.json()
            return data.url || null
        }
    } catch (e) {}
    return null
}
