/**
 * Code.gs — Backend de la plataforma "Episodios" sobre Google Sheets.
 *
 * INSTALACIÓN:
 * 1) Crea un Google Sheet con dos pestañas EXACTAS: "Episodes" y "Users".
 *    Pega los encabezados desde Episodes.sample.csv y Users.sample.csv.
 * 2) Extensions → Apps Script. Pega este archivo completo. Guarda.
 * 3) Deploy → New deployment → Type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    Copia la URL del deployment y pégala en site/js/service.js (API_URL).
 * 4) Cuando cambies este código, haz "Manage deployments → Edit → New version".
 */

// ==== ENCABEZADOS ESPERADOS ====
const EP_COLS = ['id','title','slug','type','access','description','cover','media','tags','createdAt'];
const USER_COLS = ['id','username','name','email','passwordHash','salt','sessionToken','premium','likes','list','history','createdAt'];

// ==== ENTRADA HTTP ====
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const result = handle(body);
    return json({ ok: true, data: result });
  } catch (err) {
    return json({ ok: false, error: err.message || String(err) });
  }
}
function doGet(e) {
  return json({ ok: true, data: { hello: 'Episodios API. Usa POST.' } });
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==== ROUTER ====
function handle(body) {
  const action = body.action;
  switch (action) {
    case 'getEpisodes': return getEpisodes();
    case 'register':    return register(body);
    case 'login':       return login(body);
    case 'getUser':     return getUser(requireAuth(body));
    case 'toggleLike':  return toggleArrayField(requireAuth(body), 'likes', body.episodeId);
    case 'toggleList':  return toggleArrayField(requireAuth(body), 'list', body.episodeId);
    case 'addHistory':  return addHistory(requireAuth(body), body.episodeId);
    case 'setPremium':  return setPremium(requireAuth(body), body.value);
    default: throw new Error('Acción desconocida: ' + action);
  }
}

// ==== HELPERS DE HOJA ====
function sheet(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Falta la hoja: ' + name);
  return sh;
}
function readAll(sheetName, cols) {
  const sh = sheet(sheetName);
  const values = sh.getDataRange().getValues();
  if (values.length < 1) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null))
    .map(row => {
      const o = {};
      cols.forEach(c => {
        const idx = headers.indexOf(c);
        o[c] = idx >= 0 ? row[idx] : '';
      });
      return o;
    });
}
function findRowIndex(sheetName, col, value) {
  const sh = sheet(sheetName);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const idx = headers.indexOf(col);
  if (idx < 0) return -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idx]) === String(value)) return i + 1; // 1-based
  }
  return -1;
}
function updateRow(sheetName, rowIndex, obj, cols) {
  const sh = sheet(sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  cols.forEach(c => {
    if (!(c in obj)) return;
    const col = headers.indexOf(c);
    if (col < 0) return;
    sh.getRange(rowIndex, col + 1).setValue(obj[c]);
  });
}
function appendRow(sheetName, obj, cols) {
  const sh = sheet(sheetName);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const row = headers.map(h => (h in obj ? obj[h] : ''));
  sh.appendRow(row);
}

// ==== EPISODIOS ====
function getEpisodes() {
  return readAll('Episodes', EP_COLS).map(e => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    type: (e.type || 'video').toLowerCase(),
    access: (e.access || 'free').toLowerCase(),
    description: e.description,
    cover: e.cover,
    media: e.media,
    tags: e.tags,
    createdAt: e.createdAt,
  }));
}

// ==== USUARIOS ====
function userToPublic(u) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    premium: u.premium === true || String(u.premium).toUpperCase() === 'TRUE',
    likes: parseJson(u.likes, []),
    list: parseJson(u.list, []),
    history: parseJson(u.history, []),
    createdAt: u.createdAt,
  };
}
function parseJson(v, fb) {
  if (Array.isArray(v)) return v;
  if (!v) return fb;
  try { return JSON.parse(v); } catch { return fb; }
}
function requireAuth(body) {
  if (!body.userId || !body.token) throw new Error('No autenticado');
  const users = readAll('Users', USER_COLS);
  const u = users.find(x => String(x.id) === String(body.userId) && x.sessionToken === body.token);
  if (!u) throw new Error('Sesión inválida');
  return u;
}
function sha256Hex(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}
function randHex(n) {
  const bytes = new Array(n).fill(0).map(() => Math.floor(Math.random() * 256));
  return bytes.map(b => ('0' + b.toString(16)).slice(-2)).join('');
}

function register(body) {
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!name || !email || !password) throw new Error('Faltan datos');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');

  const users = readAll('Users', USER_COLS);
  if (users.some(u => String(u.email).toLowerCase() === email)) throw new Error('Ese email ya está registrado');

  const id = users.length + 1;
  const firstName = name.split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const username = '@' + String(id).padStart(4, '0') + firstName;
  const salt = randHex(16);
  const passwordHash = sha256Hex(salt + password);
  const sessionToken = randHex(24);

  const user = {
    id, username, name, email,
    passwordHash, salt, sessionToken,
    premium: false,
    likes: '[]', list: '[]', history: '[]',
    createdAt: new Date().toISOString(),
  };
  appendRow('Users', user, USER_COLS);
  return { user: userToPublic(user), token: sessionToken };
}

function login(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const users = readAll('Users', USER_COLS);
  const u = users.find(x => String(x.email).toLowerCase() === email);
  if (!u) throw new Error('Email o contraseña incorrectos');
  const hash = sha256Hex(u.salt + password);
  if (hash !== u.passwordHash) throw new Error('Email o contraseña incorrectos');

  const token = randHex(24);
  const rowIndex = findRowIndex('Users', 'id', u.id);
  updateRow('Users', rowIndex, { sessionToken: token }, USER_COLS);
  u.sessionToken = token;
  return { user: userToPublic(u), token };
}

function getUser(u) { return userToPublic(u); }

function toggleArrayField(u, field, episodeId) {
  if (episodeId == null) throw new Error('Falta episodeId');
  const arr = parseJson(u[field], []);
  const idStr = String(episodeId);
  const idx = arr.findIndex(x => String(x) === idStr);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(isNaN(Number(episodeId)) ? episodeId : Number(episodeId));
  const rowIndex = findRowIndex('Users', 'id', u.id);
  const patch = {}; patch[field] = JSON.stringify(arr);
  updateRow('Users', rowIndex, patch, USER_COLS);
  u[field] = patch[field];
  return userToPublic(u);
}

function addHistory(u, episodeId) {
  if (episodeId == null) throw new Error('Falta episodeId');
  const arr = parseJson(u.history, []);
  const idNum = isNaN(Number(episodeId)) ? episodeId : Number(episodeId);
  // evitar duplicados consecutivos
  const filtered = arr.filter(h => String(h.id) !== String(idNum));
  filtered.push({ id: idNum, at: new Date().toISOString() });
  // limitar a los últimos 200
  const trimmed = filtered.slice(-200);
  const rowIndex = findRowIndex('Users', 'id', u.id);
  updateRow('Users', rowIndex, { history: JSON.stringify(trimmed) }, USER_COLS);
  u.history = JSON.stringify(trimmed);
  return userToPublic(u);
}

function setPremium(u, value) {
  const rowIndex = findRowIndex('Users', 'id', u.id);
  updateRow('Users', rowIndex, { premium: !!value }, USER_COLS);
  u.premium = !!value;
  return userToPublic(u);
}
