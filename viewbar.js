/* The persistent "view in app" bar, shared by every page.
 *
 * Reuses the deep-link behaviour already proven in t/index.html: fire
 * insnaps://topic/<slug> on app-capable devices, fall through to the right
 * store, and never attempt a deep link on desktop. Deliberately a slim bar
 * rather than a full-screen interstitial, which Google penalises on mobile.
 *
 * window.InSnapsViewBar.mount({ topic, slug, label, sub })
 * window.InSnapsViewBar.set({ topic, slug, label, sub })
 * window.InSnapsViewBar.openApp(slugOrNull)
 */
(function () {
  'use strict';

  var APP_STORE = 'https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049';
  var PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree';
  var SCHEME = 'insnaps';
  var ANDROID_PKG = 'com.prakshaappthree.appthree';
  var DISMISS_KEY = 'insnaps_viewbar_dismissed';

  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  // iPadOS 13+ reports a Macintosh UA; separate it via touch support.
  var isIPadOS = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || isIPadOS;
  var isMac = /Macintosh/i.test(ua) && !isIPadOS;
  var canOpenApp = isAndroid || isIOS || isMac;
  var platform = isAndroid ? 'android' : isIPadOS ? 'ipados' : isIOS ? 'ios' : isMac ? 'mac' : 'desktop';

  function track(name, params) {
    if (window.gtag) window.gtag('event', name, params || {});
  }

  function slugify(text) {
    return String(text || '').trim().toLowerCase()
      .replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 64);
  }

  function androidIntent(slug, withFallback) {
    return 'intent://topic/' + encodeURIComponent(slug) +
      '#Intent;scheme=' + SCHEME + ';package=' + ANDROID_PKG + ';' +
      (withFallback ? 'S.browser_fallback_url=' + encodeURIComponent(PLAY_STORE) + ';' : '') +
      'end';
  }

  function customScheme(slug) {
    return SCHEME + '://topic/' + encodeURIComponent(slug);
  }

  var bar = null;
  var els = {};
  var state = { topic: null, slug: null };

  function openApp(slug) {
    slug = slug || state.slug;
    track('viewbar_open_app', { platform: platform, topic: slug || 'none' });

    if (!canOpenApp) {
      // Desktop has no app to open — send them to the store that fits.
      window.open(isAndroid ? PLAY_STORE : APP_STORE, '_blank', 'noopener');
      return;
    }
    if (!slug) {
      window.location.href = isAndroid ? PLAY_STORE : APP_STORE;
      return;
    }
    if (isAndroid) {
      // Chrome itself falls back to the Play Store when the app is missing.
      window.location.href = androidIntent(slug, true);
    } else {
      window.location.href = customScheme(slug);
      // Nothing registered for the scheme means nothing happens, so hand off
      // to the store after a beat.
      setTimeout(function () { window.location.href = APP_STORE; }, 1500);
    }
  }

  function build() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'viewbar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Open in the InSnaps app');
    bar.innerHTML =
      '<img class="viewbar-icon" src="/logo.png" alt="" width="34" height="34">' +
      '<div class="viewbar-text">' +
        '<strong data-el="label">Open in InSnaps</strong>' +
        '<span data-el="sub">Narrated, endless, tuned to your city</span>' +
      '</div>' +
      '<button class="viewbar-cta" data-el="cta" type="button">Open</button>' +
      '<button class="viewbar-close" data-el="close" type="button" aria-label="Dismiss">&times;</button>';
    document.body.appendChild(bar);

    els.label = bar.querySelector('[data-el="label"]');
    els.sub = bar.querySelector('[data-el="sub"]');
    els.cta = bar.querySelector('[data-el="cta"]');
    els.close = bar.querySelector('[data-el="close"]');

    els.cta.addEventListener('click', function () { openApp(state.slug); });
    els.close.addEventListener('click', function () {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
      hide();
      track('viewbar_dismiss', { platform: platform });
    });
    return bar;
  }

  function dismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
  }

  function show() {
    if (!bar || dismissed()) return;
    bar.classList.add('is-mounted');
    document.body.classList.add('has-viewbar');
    // Next frame, so the transform transition actually runs.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { bar.classList.add('is-shown'); });
    });
  }

  function hide() {
    if (!bar) return;
    bar.classList.remove('is-shown');
    document.body.classList.remove('has-viewbar');
    setTimeout(function () {
      if (bar && !bar.classList.contains('is-shown')) bar.classList.remove('is-mounted');
    }, 280);
  }

  function set(opts) {
    opts = opts || {};
    if (!bar) return;
    if (opts.topic || opts.slug) {
      state.topic = opts.topic || null;
      state.slug = opts.slug || (opts.topic ? slugify(opts.topic) : null);
    }
    var label = opts.label ||
      (state.topic ? 'Open ' + state.topic + ' in InSnaps' : 'Open in InSnaps');
    els.label.textContent = label;
    if (opts.sub) els.sub.textContent = opts.sub;
    els.cta.textContent = canOpenApp ? 'Open' : 'Get app';
  }

  function mount(opts) {
    if (dismissed()) return null;
    build();
    set(opts || {});
    show();
    track('viewbar_view', { platform: platform, topic: state.slug || 'none' });
    return { set: set, show: show, hide: hide, openApp: openApp };
  }

  window.InSnapsViewBar = {
    mount: mount,
    set: function (o) { if (bar) set(o); else mount(o); },
    show: show,
    hide: hide,
    openApp: openApp,
    platform: platform,
    canOpenApp: canOpenApp,
    slugify: slugify,
    stores: { apple: APP_STORE, play: PLAY_STORE }
  };
})();
