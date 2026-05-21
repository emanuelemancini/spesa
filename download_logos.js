import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const domains = {
  'a&o': 'aeo.it',
  'aldi': 'aldi.it',
  'bennet': 'bennet.com',
  'carrefour': 'carrefour.it',
  'conad': 'conad.it',
  'coop': 'e-coop.it',
  'crai': 'craiweb.it',
  'despar': 'despar.it',
  'esselunga': 'esselunga.it',
  'eurospin': 'eurospin.it',
  'famila': 'famila.it',
  "in's mercato": 'insmercato.it',
  'iper': 'iper.it',
  'lidl': 'lidl.it',
  'md': 'mdspa.it',
  'oasi': 'supermercatioasi.it',
  'pam': 'pampanorama.it',
  'penny': 'pennymarket.it',
  'tigre': 'supermercatitigre.it',
  'unes': 'unes.it'
};

const dir = path.join(__dirname, 'public', 'logos');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

async function downloadLogo(name, domain) {
  // Use clearbit with User-Agent
  const url = `https://logo.clearbit.com/${domain}?size=256`;
  const filename = name.replace(/[^a-z0-9]/g, '') + '.png';
  const dest = path.join(dir, filename);
  
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
        if(res.statusCode === 301 || res.statusCode === 302) {
             https.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res2) => {
                  if (res2.statusCode === 200) {
                      const file = fs.createWriteStream(dest);
                      res2.pipe(file);
                      file.on('finish', () => { file.close(); resolve(true); });
                  } else { resolve(false); }
             }).on('error', () => resolve(false));
        } else {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(true); });
        }
      } else {
        resolve(false);
      }
    }).on('error', () => resolve(false));
  });
}

(async () => {
  for (const [name, domain] of Object.entries(domains)) {
    const success = await downloadLogo(name, domain);
    console.log(`${name}: ${success ? 'OK' : 'FAIL'}`);
  }
})();
