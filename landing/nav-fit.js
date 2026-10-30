/*
 * nav-fit.js - keeps the landing header on one line at any width.
 *
 * CSS breakpoints in landing.css collapse the header for the Sora font at
 * the default text size. A fallback font, browser zoom or a larger default
 * text size can still make the row overflow, so this measures the real row
 * and applies the smallest collapse tier that fits:
 *   nav--compact  links move into the menu
 *   nav--tight    the secondary "Create account" button is hidden
 *   nav--mini     the wordmark shows the icon only
 */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  var row = nav && nav.querySelector('.container');
  if (!row) return;

  var TIERS = ['nav--compact', 'nav--tight', 'nav--mini'];
  var frame = 0;

  function overflows() {
    return row.scrollWidth > row.clientWidth + 1;
  }

  function fit() {
    frame = 0;
    TIERS.forEach(function (tier) { nav.classList.remove(tier); });
    for (var i = 0; i < TIERS.length && overflows(); i += 1) {
      nav.classList.add(TIERS[i]);
    }
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(fit);
  }

  if (typeof window.ResizeObserver === 'function') {
    // Text-only zoom resizes the items without resizing the row.
    var observer = new window.ResizeObserver(schedule);
    [row, nav.querySelector('.wordmark'), nav.querySelector('.nav-actions')].forEach(function (el) {
      if (el) observer.observe(el);
    });
  } else {
    window.addEventListener('resize', schedule);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule);
  }
  schedule();
})();
