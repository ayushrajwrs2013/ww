(function () {
  'use strict';

  var STORE = 'ww_lang';
  var current = 'en';
  var dictLoading = false;
  var pending = [];
  var textOrig = new WeakMap();
  var attrOrig = new WeakMap();
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var RTL = { ur: 1, sd: 1, ks: 1 };

  var CSS = ''
    + '.ww-lang{display:inline-flex;align-items:center;gap:6px;}'
    + '.ww-lang .ww-lang-globe{font-size:15px;line-height:1;}'
    + '.ww-lang select{'
    +   'font-family:inherit;font-size:13px;font-weight:600;'
    +   'padding:7px 10px;border-radius:20px;'
    +   'border:2px solid var(--primary,#2E7D32);'
    +   'background:var(--white,#fff);color:var(--text,#1A1A2E);'
    +   'cursor:pointer;max-width:190px;outline:none;}'
    + '.ww-lang select:focus{border-color:var(--primary,#2E7D32);}';

  function t(str) {
    if (current === 'en') return str;
    var d = window.WW_I18N && window.WW_I18N[current];
    if (!d) return str;
    var v = d[str];
    return (v == null || v === '') ? str : v;
  }

  function ensureDict(cb) {
    if (window.WW_I18N) { cb(); return; }
    pending.push(cb);
    if (dictLoading) return;
    dictLoading = true;
    var s = document.createElement('script');
    s.src = 'i18n/dictionary.js';
    s.onload = function () {
      var q = pending; pending = [];
      for (var i = 0; i < q.length; i++) { try { q[i](); } catch (e) {} }
    };
    s.onerror = function () { dictLoading = false; };
    document.body.appendChild(s);
  }

  function isSkipped(el) {
    if (!el) return false;
    if (el.nodeType === 3) el = el.parentNode;
    return !!(el && el.closest && el.closest('.ww-lang'));
  }

  function applyText(node) {
    var orig;
    if (textOrig.has(node)) orig = textOrig.get(node);
    else { orig = node.nodeValue; textOrig.set(node, orig); }
    if (current === 'en') {
      if (node.nodeValue !== orig) node.nodeValue = orig;
      return;
    }
    var m = orig.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var core = m[2];
    if (!core) return;
    var val = m[1] + t(core) + m[3];
    if (node.nodeValue !== val) node.nodeValue = val;
  }

  function applyAttrs(el) {
    var rec;
    if (attrOrig.has(el)) rec = attrOrig.get(el);
    else { rec = {}; attrOrig.set(el, rec); }
    var list = ATTRS.slice();
    if (el.tagName === 'INPUT') {
      var ty = (el.getAttribute('type') || '').toLowerCase();
      if (ty === 'submit' || ty === 'button' || ty === 'reset') list.push('value');
    }
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!el.hasAttribute(a)) continue;
      if (!(a in rec)) rec[a] = el.getAttribute(a);
      var want = (current === 'en') ? rec[a] : t(rec[a]);
      if (el.getAttribute(a) !== want) el.setAttribute(a, want);
    }
  }

  function walk(root) {
    if (!root) return;
    var nt = root.nodeType;
    if (nt === 3) { applyText(root); return; }
    if (nt !== 1) return;
    var tag = root.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
    if (root.classList && root.classList.contains('ww-lang')) return;
    applyAttrs(root);
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n);
  }

  function applyAll() {
    document.documentElement.lang = current;
    document.documentElement.dir = RTL[current] ? 'rtl' : 'ltr';
    if (document.body) walk(document.body);
    var sel = document.getElementById('wwLangSelect');
    if (sel && sel.value !== current) sel.value = current;
  }

  function setLang(code) {
    current = code || 'en';
    try { localStorage.setItem(STORE, current); } catch (e) {}
    if (current === 'en') applyAll();
    else ensureDict(applyAll);
  }

  function buildSelect() {
    if (document.getElementById('wwLangSelect')) return;
    var langs = window.WW_LANGUAGES || [{ code: 'en', native: 'English', en: 'English' }];
    var wrap = document.createElement('div');
    wrap.className = 'ww-lang';
    var globe = document.createElement('span');
    globe.className = 'ww-lang-globe';
    globe.setAttribute('aria-hidden', 'true');
    globe.textContent = '\uD83C\uDF10';
    var sel = document.createElement('select');
    sel.id = 'wwLangSelect';
    sel.setAttribute('aria-label', 'Select language');
    for (var i = 0; i < langs.length; i++) {
      var o = document.createElement('option');
      o.value = langs[i].code;
      o.textContent = langs[i].native + ' (' + langs[i].en + ')';
      sel.appendChild(o);
    }
    sel.value = current;
    sel.addEventListener('change', function () { setLang(sel.value); });
    wrap.appendChild(globe);
    wrap.appendChild(sel);

    var nav = document.querySelector('.navbar');
    var links = nav ? nav.querySelector('.nav-links') : null;
    if (links) links.insertBefore(wrap, links.firstChild);
    else if (nav) nav.appendChild(wrap);
    else {
      wrap.style.position = 'fixed';
      wrap.style.top = '14px';
      wrap.style.right = '86px';
      wrap.style.zIndex = '1000';
      document.body.appendChild(wrap);
    }
  }

  function observe() {
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].type !== 'childList') continue;
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (isSkipped(n)) continue;
          if (n.nodeType === 3) applyText(n);
          else if (n.nodeType === 1) walk(n);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function addStyle() {
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function init() {
    addStyle();
    var qp = null;
    try { qp = new URLSearchParams(location.search).get('lang'); } catch (e) { qp = null; }
    if (qp) {
      current = qp;
      try { localStorage.setItem(STORE, current); } catch (e) {}
    } else {
      try { current = localStorage.getItem(STORE) || 'en'; } catch (e) { current = 'en'; }
    }
    if (!window.WW_I18N && window.WW_LANGUAGES) {
      var known = false;
      for (var i = 0; i < window.WW_LANGUAGES.length; i++) {
        if (window.WW_LANGUAGES[i].code === current) { known = true; break; }
      }
      if (!known) current = 'en';
    }
    buildSelect();
    if (current === 'en') applyAll();
    else ensureDict(applyAll);
    observe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
