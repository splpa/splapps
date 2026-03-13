const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getAllLinks, getLink, createLink, updateLink, deleteLink, getAllPathLinks, getPathLink, createPathLink, updatePathLink, deletePathLink, getAllPathSections, getPathSection, createPathSection, updatePathSection, deletePathSection } = require('./db');

// --- PubMed feed (server-side, 30-min cache) ---
let pubmedCache = { items: [], fetchedAt: 0 };
async function getPubmedFeed() {
  const TTL = 30 * 60 * 1000;
  if (Date.now() - pubmedCache.fetchedAt < TTL && pubmedCache.items.length) return pubmedCache.items;
  try {
    const s = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=Am+J+Surg+Pathol%5Bjour%5D&retmax=10&sort=pub_date&retmode=json');
    const sd = await s.json();
    const ids = sd.esearchresult.idlist;
    if (!ids.length) return pubmedCache.items;
    const r = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`);
    const rd = await r.json();
    pubmedCache = {
      items: ids.map(id => {
        const a = rd.result[id];
        return {
          title: a.title,
          link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          pubdate: a.pubdate,
          authors: a.authors ? a.authors.slice(0,3).map(x => x.name).join(', ') + (a.authors.length > 3 ? ' et al.' : '') : ''
        };
      }),
      fetchedAt: Date.now()
    };
  } catch(e) {
    console.error('[PubMed]', e.message);
  }
  return pubmedCache.items;
}

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect('/admin/login');
}

// --- Public routes ---
app.get('/', (req, res) => {
  const links = getAllLinks();
  res.render('index', { links });
});

// --- Auth routes ---
app.get('/admin/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Invalid password' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// --- Admin routes ---
app.get('/admin', requireAuth, (req, res) => {
  const links = getAllLinks();
  res.render('admin', { links });
});

app.post('/admin/links', requireAuth, upload.single('image'), (req, res) => {
  const { title, url, icon, sort_order } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : '';
  createLink({ title, url, icon, image, sort_order: parseInt(sort_order) || 0 });
  res.redirect('/admin');
});

app.post('/admin/links/:id', requireAuth, upload.single('image'), (req, res) => {
  const { title, url, icon, sort_order } = req.body;
  const data = { title, url, icon, sort_order: parseInt(sort_order) || 0 };
  if (req.file) {
    data.image = `/uploads/${req.file.filename}`;
    // Remove old image
    const existing = getLink(parseInt(req.params.id));
    if (existing && existing.image) {
      const oldPath = path.join(__dirname, 'public', existing.image);
      fs.unlink(oldPath, () => {});
    }
  }
  updateLink(parseInt(req.params.id), data);
  res.redirect('/admin');
});

app.post('/admin/links/:id/remove-image', requireAuth, (req, res) => {
  const link = getLink(parseInt(req.params.id));
  if (link && link.image) {
    const imgPath = path.join(__dirname, 'public', link.image);
    fs.unlink(imgPath, () => {});
    updateLink(parseInt(req.params.id), { ...link, image: '' });
  }
  res.redirect('/admin');
});

app.post('/admin/links/:id/delete', requireAuth, (req, res) => {
  const link = getLink(parseInt(req.params.id));
  if (link && link.image) {
    const imgPath = path.join(__dirname, 'public', link.image);
    fs.unlink(imgPath, () => {});
  }
  deleteLink(parseInt(req.params.id));
  res.redirect('/admin');
});

// Seed defaults
function seedPathDefaults() {
  const allLinks = getAllPathLinks();
  if (!allLinks.find(l => l.section === 'news_cap'))
    createPathLink({ title: 'CAP', url: '#', section: 'news_cap', sort_order: 0 });
  if (!allLinks.find(l => l.section === 'news_ajsp'))
    createPathLink({ title: 'AMERICAN JOURNAL OF SURG. PATH.', url: '#', section: 'news_ajsp', sort_order: 1 });

  const allSections = getAllPathSections();
  if (!allSections.length) {
    createPathSection({ key: 'cmc', label: 'CMC Links',    icon: '/logo-cmc-xs.jpg', has_icd_search: 0, sort_order: 0 });
    createPathSection({ key: 'icd', label: 'ICD 10 Codes', icon: '/file-2.png',       has_icd_search: 1, sort_order: 1 });
    createPathSection({ key: 'pa',  label: 'PA Links',     icon: '/logo-pa-xs.jpg',   has_icd_search: 0, sort_order: 2 });
  }
}
seedPathDefaults();

// --- Pathologist routes ---
app.get('/pathologist', async (req, res) => {
  const links    = getAllPathLinks();
  const sectionDefs = getAllPathSections();
  const news_cap  = links.find(l => l.section === 'news_cap')  || { title: 'CAP', url: '#' };
  const news_ajsp = links.find(l => l.section === 'news_ajsp') || { title: 'AMERICAN JOURNAL OF SURG. PATH.', url: '#' };
  const sectionData = sectionDefs.map(s => ({
    ...s,
    links: links.filter(l => l.section === s.key)
  }));
  const feedItems = await getPubmedFeed();
  res.render('pathologist', { sectionData, news_cap, news_ajsp, feedItems });
});

app.get('/pathologist/admin/login', (req, res) => {
  res.render('pathologist-login', { error: null });
});

app.post('/pathologist/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.path_authenticated = true;
    return res.redirect('/pathologist/admin');
  }
  res.render('pathologist-login', { error: 'Invalid password' });
});

app.get('/pathologist/admin/logout', (req, res) => {
  req.session.path_authenticated = false;
  res.redirect('/pathologist/admin/login');
});

function requirePathAuth(req, res, next) {
  if (req.session && req.session.path_authenticated) return next();
  res.redirect('/pathologist/admin/login');
}

app.get('/pathologist/admin', requirePathAuth, (req, res) => {
  const links = getAllPathLinks();
  const sections = getAllPathSections();
  const footerLinks = {
    cap:  links.find(l => l.section === 'news_cap'),
    ajsp: links.find(l => l.section === 'news_ajsp'),
  };
  res.render('pathologist-admin', { links: links.filter(l => !['news_cap','news_ajsp'].includes(l.section)), footerLinks, sections });
});

// Section CRUD
app.post('/pathologist/admin/sections', requirePathAuth, (req, res) => {
  const { key, label, icon, has_icd_search, sort_order } = req.body;
  createPathSection({ key: key.toLowerCase().replace(/\s+/g,'_'), label, icon, has_icd_search: !!has_icd_search, sort_order: parseInt(sort_order) || 0 });
  res.redirect('/pathologist/admin');
});

app.post('/pathologist/admin/sections/:id', requirePathAuth, (req, res) => {
  const { key, label, icon, has_icd_search, sort_order } = req.body;
  updatePathSection(parseInt(req.params.id), { key, label, icon, has_icd_search: !!has_icd_search, sort_order: parseInt(sort_order) || 0 });
  res.redirect('/pathologist/admin');
});

app.post('/pathologist/admin/sections/:id/delete', requirePathAuth, (req, res) => {
  deletePathSection(parseInt(req.params.id));
  res.redirect('/pathologist/admin');
});

app.post('/pathologist/admin/links', requirePathAuth, (req, res) => {
  const { title, url, section, sort_order } = req.body;
  createPathLink({ title, url, section, sort_order: parseInt(sort_order) || 0 });
  res.redirect('/pathologist/admin');
});

app.post('/pathologist/admin/links/:id', requirePathAuth, (req, res) => {
  const { title, url, section, sort_order } = req.body;
  updatePathLink(parseInt(req.params.id), { title, url, section, sort_order: parseInt(sort_order) || 0 });
  res.redirect('/pathologist/admin');
});

app.post('/pathologist/admin/links/:id/delete', requirePathAuth, (req, res) => {
  deletePathLink(parseInt(req.params.id));
  res.redirect('/pathologist/admin');
});

app.listen(PORT, () => {
  console.log(`LinkPage running on http://localhost:${PORT}`);
});
