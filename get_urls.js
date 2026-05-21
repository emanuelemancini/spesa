const https = require('https');

const filesIT = {
  'esselunga': 'File:Esselunga_logo.svg',
  'conad': 'File:Conad_Logo.svg',
  'eurospin': 'File:Logo_Eurospin.svg',
  'md': 'File:Logo_MD.svg',
  'crai': 'File:Logo_CRAI.svg',
  'in\'s mercato': 'File:In%27s_Mercato_logo.svg'
};

const filesCommons = {
  'aldi': 'File:ALDI_Nord_Logo.svg',
  'bennet': 'File:Logo_Bennet_new.svg',
  'carrefour': 'File:Carrefour_logo.svg',
  'coop': 'File:Coop_Italia_logo.svg',
  'despar': 'File:SPAR_logo.svg',
  'famila': 'File:Logo_Famila.svg',
  'iper': 'File:Iper_La_grande_I_Logo.svg',
  'lidl': 'File:Lidl-Logo.svg',
  'oasi': 'File:Oasi_logo.svg',
  'pam': 'File:Pam_Panorama_logo.svg',
  'penny': 'File:Penny_Markt_Logo.svg',
  'unes': 'File:UNES_Supermercati.svg',
  'a&o': 'File:AO_logo.svg' // probably won't exist but we'll try
};

async function getUrl(wiki, filename) {
  const url = `https://${wiki}.org/w/api.php?action=query&titles=${filename}&prop=imageinfo&iiprop=url&format=json`;
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const pages = JSON.parse(data).query.pages;
          const page = Object.values(pages)[0];
          if (page.imageinfo && page.imageinfo[0].url) {
            resolve(page.imageinfo[0].url);
          } else { resolve(null); }
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const mapping = {};
  for (const [name, file] of Object.entries(filesIT)) {
    const url = await getUrl('it.wikipedia', file);
    if(url) mapping[name] = url;
  }
  for (const [name, file] of Object.entries(filesCommons)) {
    const url = await getUrl('commons.wikimedia', file);
    if(url) mapping[name] = url;
  }
  
  // Custom fallbacks
  mapping['tigre'] = 'https://www.supermercatitigre.it/brand/Oasi_Tigre_Logo.png';
  if(!mapping['a&o']) mapping['a&o'] = 'https://aeo.it/assets/images/logo.png'; // Guessing
  
  console.log("const LOGO_MAPPING = " + JSON.stringify(mapping, null, 2) + ";");
})();
