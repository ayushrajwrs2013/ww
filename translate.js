(function () {
  'use strict';

  var LANGS = 'en,hi,bn,mr,ta,te,gu,kn,ml,pa,ur,or,as,ne,si,fr,es,de,pt,ru,ar,zh-CN,ja';

  var CSS = ''
    + '.ww-lang{display:flex;align-items:center;gap:6px;}'
    + '.ww-lang .ww-lang-globe{font-size:16px;line-height:1;}'
    + '.ww-lang #google_translate_element{line-height:1;}'
    + '.goog-te-gadget{font-size:0 !important;color:transparent !important;}'
    + '.goog-te-gadget .goog-te-combo{'
    +   'font-family:inherit !important;font-size:13px !important;font-weight:600 !important;'
    +   'padding:8px 12px !important;border-radius:20px !important;'
    +   'border:2px solid var(--primary,#2E7D32) !important;'
    +   'background:var(--white,#fff) !important;color:var(--text,#1A1A2E) !important;'
    +   'cursor:pointer !important;max-width:150px;margin:0 !important;}'
    + '.goog-logo-link,.goog-te-gadget img,.goog-te-gadget .goog-te-gadget-simple a{display:none !important;}'
    + 'iframe.goog-te-banner-frame,.goog-te-banner-frame{display:none !important;}'
    + '#goog-gt-tt,.goog-te-balloon-frame{display:none !important;}'
    + '.goog-text-highlight{background:transparent !important;box-shadow:none !important;}'
    + 'body{top:0 !important;}';

  function addStyle() {
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function addWidget() {
    if (document.querySelector('.ww-lang')) return;
    var wrap = document.createElement('div');
    wrap.className = 'ww-lang';
    wrap.innerHTML = '<span class="ww-lang-globe" aria-hidden="true">\uD83C\uDF10</span>'
      + '<div id="google_translate_element"></div>';
    var nav = document.querySelector('.navbar');
    var links = nav ? nav.querySelector('.nav-links') : null;
    if (links) {
      links.insertBefore(wrap, links.firstChild);
    } else if (nav) {
      nav.appendChild(wrap);
    } else {
      wrap.style.position = 'fixed';
      wrap.style.top = '14px';
      wrap.style.right = '78px';
      wrap.style.zIndex = '1000';
      document.body.appendChild(wrap);
    }
  }

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: LANGS,
      autoDisplay: false
    }, 'google_translate_element');
  };

  function loadGoogle() {
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
  }

  function start() {
    addStyle();
    addWidget();
    loadGoogle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
