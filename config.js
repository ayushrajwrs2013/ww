/* ============================================================
   WasteWise configuration
   ------------------------------------------------------------
   WASTEWISE_API : the Google Apps Script Web App URL that
                   reads/writes the Google Sheet.
                   LEAVE EMPTY ('') to use the local Node server
                   (server.js) instead.
   WASTEWISE_KEY : admin key required to view/export responses.
   ============================================================ */
window.WASTEWISE_API = '';
window.WASTEWISE_KEY = '2gVaaxiSH4HL';

/* --- JSONP helper: lets the browser read data from Google Apps
       Script without running into CORS restrictions. --- */
function wwJsonp(url, cb) {
  var name = 'wwcb' + Math.floor(Math.random() * 1e9);
  var script = document.createElement('script');
  var done = false;
  var timer = setTimeout(function () { finish(new Error('timeout')); }, 25000);

  function finish(err, data) {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (script.parentNode) script.parentNode.removeChild(script);
    try { delete window[name]; } catch (e) { window[name] = undefined; }
    cb(err, data);
  }

  window[name] = function (data) { finish(null, data); };
  script.onerror = function () { finish(new Error('network error')); };
  script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + name;
  document.head.appendChild(script);
}

/* --- Fetch all responses. Uses the Google Apps Script Web App
       (via JSONP) when configured, otherwise the local Node server.
       Returns a Promise resolving to an array of response objects. --- */
function wwFetchStats(key) {
  key = key || window.WASTEWISE_KEY;
  return new Promise(function (resolve, reject) {
    if (window.WASTEWISE_API) {
      wwJsonp(window.WASTEWISE_API + '?key=' + encodeURIComponent(key), function (err, json) {
        if (err) return reject(err);
        if (!json) return reject(new Error('no response'));
        if (json.status !== 'success') return reject(new Error(json.message || 'error'));
        resolve(json.responses || []);
      });
    } else {
      fetch('/api/stats?key=' + encodeURIComponent(key))
        .then(function (r) {
          if (r.status === 401) throw new Error('unauthorized');
          return r.json();
        })
        .then(function (json) {
          if (json.status !== 'success') throw new Error(json.message || 'error');
          resolve(json.responses || []);
        })
        .catch(reject);
    }
  });
}

/* --- Delete a response by id. --- */
function wwDeleteResponse(key, id) {
  return new Promise(function (resolve, reject) {
    if (window.WASTEWISE_API) {
      fetch(window.WASTEWISE_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', key: key, id: id })
      }).then(function () { resolve(); }).catch(reject);
    } else {
      fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key, id: id })
      }).then(function () { resolve(); }).catch(reject);
    }
  });
}

/* --- CSV helpers (shared by the admin / viewer pages). --- */
function wwToCsv(rows, headers) {
  function esc(v) {
    v = v == null ? '' : String(v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  var lines = [headers.join(',')];
  rows.forEach(function (r) {
    lines.push(headers.map(function (h) { return esc(r[h]); }).join(','));
  });
  return lines.join('\r\n');
}

function wwDownload(filename, text) {
  var blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
