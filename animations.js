/* ============================================================
   WasteWise — smooth animations runtime
   - Scroll-reveal with stagger (IntersectionObserver + sweep)
   - Count-up statistics
   - Handles dynamically injected content (charts, cards)
   Nothing can remain hidden: a position-based sweep reveals
   any element that is in view, on load, scroll and resize.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var SELECTOR = [
    '.section-title', '.section-subtitle',
    '.pillar-card', '.gallery-item', '.person-card', '.impact-card',
    '.timeline-item', '.stat-card', '.chart-card', '.pledge-card', '.pledge-wall',
    '.contact-card', '.challenge-item', '.challenge-progress', '.fact-card',
    '.mission-section', '.timeline-container', '.calculator-card', '.calc-results',
    '.panel', '.empty-box'
  ].join(',');

  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) reveal(entries[i].target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -4% 0px' }) : null;

  function reveal(el) {
    if (!el || el.classList.contains('is-visible')) return;
    el.classList.add('is-visible');
    if (io) io.unobserve(el);
  }

  function isInView(el, pad) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return r.bottom > -pad && r.top < vh + pad;
  }

  function sweep() {
    var els = document.querySelectorAll('.reveal:not(.is-visible)');
    for (var i = 0; i < els.length; i++) {
      if (isInView(els[i], 24)) reveal(els[i]);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; sweep(); });
  }

  function tag(el) {
    if (!el || el.classList.contains('reveal')) return;
    el.classList.add('reveal');
    var parent = el.parentElement;
    if (parent) {
      var sibs = Array.prototype.filter.call(parent.children, function (c) {
        return c.classList && c.classList.contains('reveal');
      });
      var idx = sibs.indexOf(el);
      if (idx < 0) idx = 0;
      if (idx > 6) idx = 6;
      el.style.setProperty('--reveal-delay', (idx * 70) + 'ms');
    }
    if (io) io.observe(el);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    try { root.querySelectorAll(SELECTOR).forEach(tag); } catch (e) { /* noop */ }
  }

  function start() {
    scan(document);
    /* Two frames later, reveal whatever is already on screen so the
       entrance animation plays but content is never left invisible. */
    requestAnimationFrame(function () { requestAnimationFrame(sweep); });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('orientationchange', onScroll);

    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes || [], function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches(SELECTOR)) tag(n);
            scan(n);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  /* ---------------- Count-up statistics ---------------- */
  function animateCount(el) {
    if (!el || el.dataset.wwAnim === '1') return;
    var raw = (el.textContent || '').trim();
    if (el.dataset.wwDone === raw) return;
    var m = raw.match(/^([\d.,]+)(.*)$/);
    if (!m) return;
    var target = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(target)) return;

    var suffix = raw.slice(m[1].length);
    var decimals = m[1].indexOf('.') > -1 ? 1 : 0;
    var dur = 900, from = 0, startT = null;

    el.dataset.wwDone = raw;
    el.dataset.wwAnim = '1';

    function frame(t) {
      if (startT === null) startT = t;
      var p = Math.min(1, (t - startT) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = from + (target - from) * eased;
      el.textContent = (decimals ? val.toFixed(decimals) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else { el.textContent = raw; el.dataset.wwAnim = '0'; }
    }
    requestAnimationFrame(frame);
  }

  function scanCounters() { document.querySelectorAll('.stat-value').forEach(animateCount); }

  var counting = false;
  if ('MutationObserver' in window) {
    new MutationObserver(function () {
      if (counting) return;
      counting = true;
      requestAnimationFrame(function () { counting = false; scanCounters(); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.addEventListener('load', function () { sweep(); scanCounters(); });
})();
