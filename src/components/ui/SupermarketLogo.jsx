import React from 'react';

const LOGO_MAP = {
  'castoro':      `${import.meta.env.BASE_URL}logos/castoro.webp`,
  'despar':       `${import.meta.env.BASE_URL}logos/despar.png`,
  'penny':        `${import.meta.env.BASE_URL}logos/penny.png`,
  'todis':        'https://www.google.com/s2/favicons?domain=todis.it&sz=256',
  'md':           'https://www.google.com/s2/favicons?domain=mdspa.it&sz=256',
  'pam':          'https://www.google.com/s2/favicons?domain=pampanorama.it&sz=256',
  'oasi tigre':   'https://www.google.com/s2/favicons?domain=oasitigre.it&sz=256',
  'bennet':       'https://upload.wikimedia.org/wikipedia/commons/8/84/Logo_Bennet_new.svg',
  'carrefour':    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/200px-Carrefour_logo.svg.png',
  'conad':        'https://upload.wikimedia.org/wikipedia/it/thumb/a/ad/Conad-Logo-1-.svg/200px-Conad-Logo-1-.svg.png',
  'coop':         'https://upload.wikimedia.org/wikipedia/commons/d/d5/Coop_Italia_logo.svg',
  'crai':         'https://upload.wikimedia.org/wikipedia/it/thumb/9/9e/Logo_CRAI.svg/200px-Logo_CRAI.svg.png',
  'esselunga':    'https://upload.wikimedia.org/wikipedia/it/a/a4/Esselunga_logo.svg',
  'eurospin':     'https://upload.wikimedia.org/wikipedia/it/thumb/1/1a/Logo_Eurospin.svg/200px-Logo_Eurospin.svg.png',
  'famila':       'https://upload.wikimedia.org/wikipedia/commons/0/02/Logo_Famila.svg',
  "in's mercato": 'https://upload.wikimedia.org/wikipedia/it/thumb/4/41/In%27s_Mercato_logo.svg/200px-In%27s_Mercato_logo.svg.png',
  'iper':         'https://upload.wikimedia.org/wikipedia/commons/9/93/Iper_La_grande_I_Logo.svg',
  'lidl':         'https://upload.wikimedia.org/wikipedia/commons/9/91/Lidl-Logo.svg',
  'unes':         'https://upload.wikimedia.org/wikipedia/commons/9/95/UNES_Supermercati.svg',
};

const googleFavicon = (name) => {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return `https://www.google.com/s2/favicons?domain=${slug}.it&sz=256`;
};

const failedUrls = new Set();

const COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-purple-500', 'bg-rose-500', 'bg-amber-500',
];

const SupermarketLogo = ({ name, className = 'size-10' }) => {
  const normalized = name?.toLowerCase().trim() ?? '';

  const buildQueue = () => {
    const q = [];
    if (LOGO_MAP[normalized]) q.push(LOGO_MAP[normalized]);
    q.push(googleFavicon(name ?? ''));
    return q.filter(u => !failedUrls.has(u));
  };

  const [queue, setQueue]   = React.useState(() => buildQueue());
  const [src, setSrc]       = React.useState(() => buildQueue()[0] ?? null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(() => buildQueue().length === 0);

  React.useEffect(() => {
    const q = buildQueue();
    setQueue(q);
    setSrc(q[0] ?? null);
    setLoaded(false);
    setFailed(q.length === 0);
  }, [normalized]);

  const handleLoad = () => setLoaded(true);

  const handleError = () => {
    failedUrls.add(src);
    const next = queue.find(u => !failedUrls.has(u));
    if (next) {
      setSrc(next);
    } else {
      setFailed(true);
    }
  };

  const colorIndex = name ? name.length % COLORS.length : 0;
  const bgColor    = COLORS[colorIndex];

  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('')
    : '?';

  return (
    <div className={`${className} rounded-2xl relative flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300
      ${loaded ? 'bg-white p-1 border border-slate-100 shadow-sm' : bgColor}`}>

      {src && !failed && (
        <img
          key={src}
          src={src}
          alt={name}
          className={`w-full h-full object-contain rounded-xl transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0 absolute'}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {(!loaded || failed) && (
        <span className="text-white font-black leading-none select-none" style={{ fontSize: 'clamp(0.55em, 1.1em, 1.3em)' }}>
          {initials}
        </span>
      )}
    </div>
  );
};

export default SupermarketLogo;
