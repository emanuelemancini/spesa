const https = require('https');

const LOGO_MAPPING = {
  'a&o': 'https://upload.wikimedia.org/wikipedia/commons/5/54/A%26O_Logo.svg',
  'aldi': 'https://upload.wikimedia.org/wikipedia/commons/d/db/ALDI_Nord_Logo_2015.png',
  'bennet': 'https://upload.wikimedia.org/wikipedia/commons/8/84/Logo_Bennet_new.svg',
  'carrefour': 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Carrefour_logo.svg',
  'conad': 'https://upload.wikimedia.org/wikipedia/it/a/ad/Conad-Logo-1-.svg',
  'coop': 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Coop_Italia_logo.svg',
  'crai': 'https://upload.wikimedia.org/wikipedia/it/9/9e/Logo_CRAI.svg',
  'despar': 'https://upload.wikimedia.org/wikipedia/commons/3/30/SPAR_logo.svg',
  'esselunga': 'https://upload.wikimedia.org/wikipedia/it/a/a4/Esselunga_logo.svg',
  'eurospin': 'https://upload.wikimedia.org/wikipedia/it/1/1a/Logo_Eurospin.svg',
  'famila': 'https://upload.wikimedia.org/wikipedia/commons/0/02/Logo_Famila.svg',
  'in\'s mercato': 'https://upload.wikimedia.org/wikipedia/it/4/41/In%27s_Mercato_logo.svg',
  'iper': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Iper_La_grande_I_Logo.svg',
  'lidl': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Lidl-Logo.svg',
  'md': 'https://upload.wikimedia.org/wikipedia/it/e/e4/Logo_MD.svg',
  'oasi': 'https://www.supermercatioasi.it/brand/Oasi_Tigre_Logo.png',
  'pam': 'https://upload.wikimedia.org/wikipedia/commons/d/df/Pam_Panorama_logo.svg',
  'penny': 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Penny-Logo.svg',
  'tigre': 'https://www.supermercatitigre.it/brand/Oasi_Tigre_Logo.png',
  'unes': 'https://upload.wikimedia.org/wikipedia/commons/9/95/UNES_Supermercati.svg'
};

async function testUrl(name, url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      resolve(`${name}: HTTP ${res.statusCode} Content-Type: ${res.headers['content-type']}`);
    }).on('error', e => resolve(`${name}: Error ${e.message}`));
  });
}

(async () => {
  for (const [name, url] of Object.entries(LOGO_MAPPING)) {
    console.log(await testUrl(name, url));
  }
})();
