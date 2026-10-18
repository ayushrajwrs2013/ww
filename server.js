var http = require('http');
var fs = require('fs');
var path = require('path');
var URL = require('url');

var PORT = process.env.PORT || 5500;
var ADMIN_KEY = process.env.ADMIN_KEY || '2gVaaxiSH4HL';
var ROOT = __dirname;
var DATA_DIR = path.join(ROOT, 'data');
var DB_FILE = path.join(DATA_DIR, 'responses.db');
var DATABASE_URL = process.env.DATABASE_URL || '';
var USE_PG = DATABASE_URL.length > 0;

var HEADERS = [
  'Timestamp', 'Name', 'Age', 'Gender', 'Occupation', 'Town',
  'Frequent Waste Types', 'Largest Waste', 'Segregate Waste',
  'Food Waste Handling', 'Plastic Harms Aquatic Life',
  'Useful Scientific Model', 'Other Details', 'Suggestion'
];

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

var db = null;
var pool = null;

var CREATE_SQLITE =
  'CREATE TABLE IF NOT EXISTS responses (' +
  'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
  'created_at TEXT, name TEXT, age TEXT, gender TEXT, occupation TEXT, town TEXT,' +
  'waste_frequent TEXT, waste_largest TEXT, segregate TEXT, food_waste TEXT,' +
  'plastic_harm TEXT, model_useful TEXT, other_details TEXT, suggestion TEXT)';

var CREATE_PG =
  'CREATE TABLE IF NOT EXISTS responses (' +
  'id SERIAL PRIMARY KEY,' +
  'created_at TEXT, name TEXT, age TEXT, gender TEXT, occupation TEXT, town TEXT,' +
  'waste_frequent TEXT, waste_largest TEXT, segregate TEXT, food_waste TEXT,' +
  'plastic_harm TEXT, model_useful TEXT, other_details TEXT, suggestion TEXT)';

var INSERT_COLS = 'created_at, name, age, gender, occupation, town, waste_frequent, ' +
  'waste_largest, segregate, food_waste, plastic_harm, model_useful, other_details, suggestion';

function persist() {
  if (USE_PG || !db) return;
  var data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function rowValues(p) {
  return [
    p.timestamp || new Date().toISOString(),
    p.name || '',
    p.age != null ? String(p.age) : '',
    p.gender || '',
    p.occupation || '',
    p.town || '',
    p.wasteFrequent || '',
    p.wasteLargest || '',
    p.segregate || '',
    p.foodWaste || '',
    p.plasticHarm || '',
    p.modelUseful || '',
    p.otherDetails || '',
    p.suggestion || ''
  ];
}

function initStore(cb) {
  if (USE_PG) {
    var pg = require('pg');
    var needsSsl = DATABASE_URL.indexOf('localhost') === -1;
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : false
    });
    return pool.query(CREATE_PG, function (err) { cb(err); });
  }

  var initSqlJs = require('sql.js');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  initSqlJs({ locateFile: function (f) { return path.join(ROOT, 'node_modules', 'sql.js', 'dist', f); } })
    .then(function (SQL) {
      if (fs.existsSync(DB_FILE)) {
        db = new SQL.Database(new Uint8Array(fs.readFileSync(DB_FILE)));
      } else {
        db = new SQL.Database();
      }
      db.run(CREATE_SQLITE);
      persist();
      cb(null);
    })
    .catch(cb);
}

function insertResponse(p, cb) {
  var vals = rowValues(p);
  if (USE_PG) {
    var placeholders = vals.map(function (_, i) { return '$' + (i + 1); }).join(',');
    return pool.query('INSERT INTO responses (' + INSERT_COLS + ') VALUES (' + placeholders + ')', vals, function (err) { cb(err); });
  }
  try {
    var stmt = db.prepare('INSERT INTO responses (' + INSERT_COLS + ') VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    stmt.run(vals);
    stmt.free();
    persist();
    cb(null);
  } catch (e) {
    cb(e);
  }
}

function getResponses(cb) {
  if (USE_PG) {
    return pool.query('SELECT * FROM responses ORDER BY id DESC', function (err, result) {
      if (err) return cb(err);
      cb(null, result.rows);
    });
  }
  var res = db.exec('SELECT * FROM responses ORDER BY id DESC');
  var out = [];
  if (res.length) {
    var cols = res[0].columns;
    res[0].values.forEach(function (row) {
      var o = {};
      cols.forEach(function (c, i) { o[c] = row[i] == null ? '' : String(row[i]); });
      out.push(o);
    });
  }
  cb(null, out);
}

function deleteResponse(id, cb) {
  if (USE_PG) {
    return pool.query('DELETE FROM responses WHERE id = $1', [id], function (err) { cb(err); });
  }
  try {
    db.run('DELETE FROM responses WHERE id = ?', [id]);
    persist();
    cb(null);
  } catch (e) {
    cb(e);
  }
}

function toApiShape(rows) {
  return rows.map(function (r) {
    var o = {};
    o[HEADERS[0]] = r.created_at || '';
    o[HEADERS[1]] = r.name || '';
    o[HEADERS[2]] = r.age || '';
    o[HEADERS[3]] = r.gender || '';
    o[HEADERS[4]] = r.occupation || '';
    o[HEADERS[5]] = r.town || '';
    o[HEADERS[6]] = r.waste_frequent || '';
    o[HEADERS[7]] = r.waste_largest || '';
    o[HEADERS[8]] = r.segregate || '';
    o[HEADERS[9]] = r.food_waste || '';
    o[HEADERS[10]] = r.plastic_harm || '';
    o[HEADERS[11]] = r.model_useful || '';
    o[HEADERS[12]] = r.other_details || '';
    o[HEADERS[13]] = r.suggestion || '';
    o.id = r.id;
    return o;
  });
}

function csvEscape(v) {
  var s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows) {
  var lines = [HEADERS.join(',')];
  toApiShape(rows).forEach(function (o) {
    lines.push(HEADERS.map(function (h) { return csvEscape(o[h]); }).join(','));
  });
  return lines.join('\r\n');
}

function sendJson(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req, cb) {
  var chunks = [];
  var size = 0;
  req.on('data', function (c) {
    size += c.length;
    if (size > 100000) { req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', function () { cb(Buffer.concat(chunks).toString('utf8')); });
  req.on('error', function () { cb(''); });
}

function serveStatic(req, res, pathname) {
  var rel = pathname === '/' ? '/index.html' : pathname;
  var filePath = path.join(ROOT, path.normalize(rel));
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.stat(filePath, function (err, stat) {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function handle(req, res) {
  var parsed = URL.parse(req.url, true);
  var pathname = decodeURIComponent(parsed.pathname);
  var query = parsed.query || {};

  if (pathname === '/api/submit' && req.method === 'POST') {
    return readBody(req, function (body) {
      var payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        return sendJson(res, 400, { status: 'error', message: 'Invalid JSON' });
      }
      insertResponse(payload, function (err) {
        if (err) return sendJson(res, 500, { status: 'error', message: String(err) });
        sendJson(res, 200, { status: 'success' });
      });
    });
  }

  if (pathname === '/api/stats') {
    if (query.key !== ADMIN_KEY) {
      return sendJson(res, 401, { status: 'error', message: 'unauthorized' });
    }
    return getResponses(function (err, rows) {
      if (err) return sendJson(res, 500, { status: 'error', message: String(err) });
      sendJson(res, 200, { status: 'success', count: rows.length, responses: toApiShape(rows) });
    });
  }

  if (pathname === '/api/export.csv') {
    if (query.key !== ADMIN_KEY) {
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('unauthorized');
    }
    return getResponses(function (err, rows) {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('error');
      }
      var csv = '\uFEFF' + toCsv(rows);
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="wastewise-responses.csv"',
        'Content-Length': Buffer.byteLength(csv)
      });
      res.end(csv);
    });
  }

  if (pathname === '/api/delete' && req.method === 'POST') {
    return readBody(req, function (body) {
      var payload;
      try { payload = JSON.parse(body); } catch (e) { payload = {}; }
      if (payload.key !== ADMIN_KEY) return sendJson(res, 401, { status: 'error', message: 'unauthorized' });
      deleteResponse(payload.id, function (err) {
        if (err) return sendJson(res, 500, { status: 'error', message: String(err) });
        sendJson(res, 200, { status: 'success' });
      });
    });
  }

  serveStatic(req, res, pathname);
}

initStore(function (err) {
  if (err) {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  }
  http.createServer(handle).listen(PORT, function () {
    console.log('WasteWise server running:');
    console.log('  Site    http://localhost:' + PORT + '/survey.html');
    console.log('  Results http://localhost:' + PORT + '/results.html');
    console.log('  Admin   http://localhost:' + PORT + '/admin.html');
    console.log('  Storage ' + (USE_PG ? 'PostgreSQL (DATABASE_URL)' : DB_FILE));
    console.log('  Admin key "' + ADMIN_KEY + '"');
  });
});
