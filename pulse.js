/* Pulse — web port of the app's reels mode (lib/widgets/reels/reels_video_card.dart).
 *
 * Behaviour copied from the app, deliberately:
 *   - The caption types from the *speech* character offset, not a timer. The app
 *     listens to Flutter TTS progress; the browser exposes the same signal via
 *     SpeechSynthesisUtterance's `boundary` event (`charIndex`).
 *   - If speech never starts within 1200ms, fall back to timer pacing so a card
 *     can never sit frozen and silent (app: _fallbackTimer).
 *   - Muted plays on a silent pace estimate, and the progress bar completing is
 *     what advances the reel (app: _seedFallbackPacing / _onEntryStatus).
 *   - Ken Burns motion and the light effect are picked deterministically from the
 *     card id, so a given story always looks the same (app: FNV-1a in
 *     ReelsTransitionResolver / PulseOverlayEffect.variantFor).
 *   - Image-less stories get one of the 44 breaking templates via the app's own
 *     h*31+c hash (app: breakingTemplateAsset).
 *   - Tapping pauses audio, motion and typing together (app: _togglePause).
 *
 * Exposes window.InSnapsPulse.mount(el, options).
 */
(function () {
  'use strict';

  var TEMPLATE_COUNT = 44;
  var TEMPLATE_PATH = '/assets/pulse/';
  var FALLBACK_MS = 1200;   // app: _fallbackTimer
  var MIN_MS = 2000;        // app: estMs.clamp(2000, 35000)
  var MAX_MS = 35000;
  var PAUSE_HINT_MS = 750;  // app: _pauseIndicatorTimer
  var REEL_GAP_MS = 1000;   // beat between reels, so they don't run together
  var DEFAULT_LIMIT = 4;
  var WPM = 165;            // silent-pace estimate

  // ── deterministic pickers (hashes match the app) ──────────────────

  // Math.imul, not `h * prime`: the product exceeds 2^53 so a float multiply
  // would lose precision and diverge from the app (Dart) and the build script
  // (Python), both of which multiply exactly.
  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function templateFor(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) {
      h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }
    var n = (h % TEMPLATE_COUNT) + 1;
    return TEMPLATE_PATH + 'bt_' + (n < 10 ? '0' + n : n) + '.webp';
  }

  // The app's 10 zoom variants, as scale + transform-origin.
  var TRANSITIONS = [
    { from: 1.00, to: 1.14, origin: '50% 50%' },
    { from: 1.00, to: 1.28, origin: '50% 50%' },
    { from: 1.14, to: 1.00, origin: '50% 50%' },
    { from: 1.28, to: 1.00, origin: '50% 50%' },
    { from: 1.00, to: 1.18, origin: '0% 0%' },
    { from: 1.00, to: 1.18, origin: '100% 0%' },
    { from: 1.00, to: 1.18, origin: '0% 100%' },
    { from: 1.00, to: 1.18, origin: '100% 100%' },
    { from: 1.18, to: 1.00, origin: '0% 0%' },
    { from: 1.18, to: 1.00, origin: '100% 100%' }
  ];

  var FX = ['sweep', 'badge', 'corner', 'vignette', 'band'];

  function transitionFor(id) { return TRANSITIONS[fnv1a(id) % TRANSITIONS.length]; }
  function fxFor(id) { return FX[fnv1a('fx' + id) % FX.length]; }

  function fxMarkup(kind) {
    if (kind === 'sweep') return '<div class="fx-sweep"></div>';
    if (kind === 'badge') return '<div class="fx-badge">BREAKING</div>';
    if (kind === 'corner') return '<div class="fx-corner"></div>';
    if (kind === 'vignette') return '<div class="fx-vignette"></div>';
    return '<div class="fx-band"></div>';
  }

  // ── text (app: ReelSpec._buildNarration) ─────────────────────────

  function endsWithPunctuation(s) { return /[.!?…]$/.test((s || '').trim()); }

  function buildNarration(headline, body, source) {
    var out = headline || '';
    if (!endsWithPunctuation(out)) out += '.';
    if (body) {
      out += ' ' + body;
      if (!endsWithPunctuation(body)) out += '.';
    }
    if (source) out += ' Source: ' + source + '.';
    return out;
  }

  function estimateMs(text) {
    var words = (text || '').trim().split(/\s+/).length;
    var ms = Math.round((words / WPM) * 60000);
    return Math.min(MAX_MS, Math.max(MIN_MS, ms));
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Accented Latin -> ASCII, applied before the [^a-z0-9-] strip in slugify().
     Without it that strip *deletes* accented letters instead of folding them,
     so "Tromso" with a slashed o became "troms" and "Zurich" with an umlaut
     became "zrich" — a slug that no longer names the place.

     Generated from Unicode decompositions plus the letters that have none
     (o-slash, ae, sharp s, d-stroke, eth, thorn, l-stroke, dotless i, oe).
     The Flutter app ships the identical table in topics_screen.dart; Dart has
     no built-in NFD normalisation, so an explicit table is the only way to
     guarantee both sides fold identically. Keys are lowercase: slugify()
     lowercases first. */
  var ASCII_FOLD = {'ß':'ss', 'à':'a', 'á':'a', 'â':'a', 'ã':'a', 'ä':'a', 'å':'a', 'æ':'ae', 'ç':'c', 'è':'e', 'é':'e', 'ê':'e', 'ë':'e', 'ì':'i', 'í':'i', 'î':'i', 'ï':'i', 'ð':'d', 'ñ':'n', 'ò':'o', 'ó':'o', 'ô':'o', 'õ':'o', 'ö':'o', 'ø':'o', 'ù':'u', 'ú':'u', 'û':'u', 'ü':'u', 'ý':'y', 'þ':'th', 'ÿ':'y', 'ā':'a', 'ă':'a', 'ą':'a', 'ć':'c', 'ĉ':'c', 'ċ':'c', 'č':'c', 'ď':'d', 'đ':'d', 'ē':'e', 'ĕ':'e', 'ė':'e', 'ę':'e', 'ě':'e', 'ĝ':'g', 'ğ':'g', 'ġ':'g', 'ģ':'g', 'ĥ':'h', 'ħ':'h', 'ĩ':'i', 'ī':'i', 'ĭ':'i', 'į':'i', 'ı':'i', 'ĵ':'j', 'ķ':'k', 'ĸ':'k', 'ĺ':'l', 'ļ':'l', 'ľ':'l', 'ł':'l', 'ń':'n', 'ņ':'n', 'ň':'n', 'ŋ':'n', 'ō':'o', 'ŏ':'o', 'ő':'o', 'œ':'oe', 'ŕ':'r', 'ŗ':'r', 'ř':'r', 'ś':'s', 'ŝ':'s', 'ş':'s', 'š':'s', 'ţ':'t', 'ť':'t', 'ŧ':'t', 'ũ':'u', 'ū':'u', 'ŭ':'u', 'ů':'u', 'ű':'u', 'ų':'u', 'ŵ':'w', 'ŷ':'y', 'ź':'z', 'ż':'z', 'ž':'z', 'ſ':'s', 'ơ':'o', 'ư':'u', 'ƶ':'z', 'ǎ':'a', 'ǐ':'i', 'ǒ':'o', 'ǔ':'u', 'ǖ':'u', 'ǘ':'u', 'ǚ':'u', 'ǜ':'u', 'ǟ':'a', 'ǡ':'a', 'ǧ':'g', 'ǩ':'k', 'ǫ':'o', 'ǭ':'o', 'ǰ':'j', 'ǵ':'g', 'ǹ':'n', 'ǻ':'a', 'ȁ':'a', 'ȃ':'a', 'ȅ':'e', 'ȇ':'e', 'ȉ':'i', 'ȋ':'i', 'ȍ':'o', 'ȏ':'o', 'ȑ':'r', 'ȓ':'r', 'ȕ':'u', 'ȗ':'u', 'ș':'s', 'ț':'t', 'ȟ':'h', 'ȧ':'a', 'ȩ':'e', 'ȫ':'o', 'ȭ':'o', 'ȯ':'o', 'ȱ':'o', 'ȳ':'y', 'ḁ':'a', 'ḃ':'b', 'ḅ':'b', 'ḇ':'b', 'ḉ':'c', 'ḋ':'d', 'ḍ':'d', 'ḏ':'d', 'ḑ':'d', 'ḓ':'d', 'ḕ':'e', 'ḗ':'e', 'ḙ':'e', 'ḛ':'e', 'ḝ':'e', 'ḟ':'f', 'ḡ':'g', 'ḣ':'h', 'ḥ':'h', 'ḧ':'h', 'ḩ':'h', 'ḫ':'h', 'ḭ':'i', 'ḯ':'i', 'ḱ':'k', 'ḳ':'k', 'ḵ':'k', 'ḷ':'l', 'ḹ':'l', 'ḻ':'l', 'ḽ':'l', 'ḿ':'m', 'ṁ':'m', 'ṃ':'m', 'ṅ':'n', 'ṇ':'n', 'ṉ':'n', 'ṋ':'n', 'ṍ':'o', 'ṏ':'o', 'ṑ':'o', 'ṓ':'o', 'ṕ':'p', 'ṗ':'p', 'ṙ':'r', 'ṛ':'r', 'ṝ':'r', 'ṟ':'r', 'ṡ':'s', 'ṣ':'s', 'ṥ':'s', 'ṧ':'s', 'ṩ':'s', 'ṫ':'t', 'ṭ':'t', 'ṯ':'t', 'ṱ':'t', 'ṳ':'u', 'ṵ':'u', 'ṷ':'u', 'ṹ':'u', 'ṻ':'u', 'ṽ':'v', 'ṿ':'v', 'ẁ':'w', 'ẃ':'w', 'ẅ':'w', 'ẇ':'w', 'ẉ':'w', 'ẋ':'x', 'ẍ':'x', 'ẏ':'y', 'ẑ':'z', 'ẓ':'z', 'ẕ':'z', 'ẖ':'h', 'ẗ':'t', 'ẘ':'w', 'ẙ':'y', 'ạ':'a', 'ả':'a', 'ấ':'a', 'ầ':'a', 'ẩ':'a', 'ẫ':'a', 'ậ':'a', 'ắ':'a', 'ằ':'a', 'ẳ':'a', 'ẵ':'a', 'ặ':'a', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e', 'ế':'e', 'ề':'e', 'ể':'e', 'ễ':'e', 'ệ':'e', 'ỉ':'i', 'ị':'i', 'ọ':'o', 'ỏ':'o', 'ố':'o', 'ồ':'o', 'ổ':'o', 'ỗ':'o', 'ộ':'o', 'ớ':'o', 'ờ':'o', 'ở':'o', 'ỡ':'o', 'ợ':'o', 'ụ':'u', 'ủ':'u', 'ứ':'u', 'ừ':'u', 'ử':'u', 'ữ':'u', 'ự':'u', 'ỳ':'y', 'ỵ':'y', 'ỷ':'y', 'ỹ':'y'};

  function foldToAscii(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      out += (ASCII_FOLD[ch] !== undefined) ? ASCII_FOLD[ch] : ch;
    }
    return out;
  }

  /* Must stay character-for-character identical to topicSlug() in the app
     (lib/screens/topics_screen.dart) — it is the shared deep-link contract. */
  function slugify(text) {
    var s = String(text || '').trim().toLowerCase();
    s = foldToAscii(s);
    return s.replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-+$/, '');
  }

  function relativeTime(iso) {
    if (!iso) return '';
    var then = Date.parse(iso);
    if (isNaN(then)) return '';
    var mins = Math.max(0, Math.round((Date.now() - then) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var h = Math.round(mins / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  var TIER_LABEL = { local: 'Local', national: 'National', world: 'World', trending: 'Trending' };

  /* Google Trends hands back bare lowercase phrases ("daniel radcliffe"), which
     read as broken in a headline or a button. Title-case for display only —
     the slug and the deep link keep the original lowercase form. */
  function titleCase(s) {
    return String(s || '').replace(/\S+/g, function (w) {
      if (w.length <= 2 && /^(a|an|of|in|on|to|vs|at|by|or)$/i.test(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    });
  }

  // ── speech ───────────────────────────────────────────────────────

  var speechSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function';

  function cancelSpeech() {
    if (!speechSupported) return;
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }

  // ── reel ─────────────────────────────────────────────────────────

  function Pulse(root, options) {
    this.root = root;
    this.opts = options || {};
    this.cards = [];
    this.slides = [];
    this.segs = [];
    this.index = 0;
    // Sound on by default, matching the app. Browsers block speech until the
    // visitor has interacted with the page, so _armAudioGesture() starts the
    // narration at the first click/tap/key instead of silently failing.
    this.muted = this.opts.muted === undefined ? false : !!this.opts.muted;
    this.audioArmed = false;
    this.paused = false;
    this.ended = false;
    this.limit = this.opts.limit || DEFAULT_LIMIT;
    this.typed = 0;
    this.timers = [];
    this.typeTimer = null;
    this.hintTimer = null;
    this.current = null;
    // Bumped on every reel change. speechSynthesis.cancel() fires `onend` on the
    // utterance it kills, and that handler used to call _advance() again —
    // double-advancing and leaving two reels running, so a new reel cleared the
    // caption while the old voice kept speaking. Callbacks now no-op if their
    // generation is stale.
    this.gen = 0;
    this._build();
  }

  Pulse.prototype._build = function () {
    var self = this;
    var r = this.root;
    r.className = 'pulse-stage';
    r.setAttribute('data-muted', this.muted ? '1' : '0');
    r.setAttribute('role', 'region');
    r.setAttribute('aria-label', 'Pulse — narrated news reel');
    r.innerHTML =
      '<div class="pulse-progress" data-el="progress"></div>' +
      '<div class="pulse-controls">' +
        '<button class="pulse-btn pulse-btn-mute" data-el="mute" type="button" aria-label="Toggle narration">' +
          '<svg class="i-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>' +
          '<svg class="i-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="pulse-slides" data-el="slides"></div>' +
      '<div class="pulse-pause-hint" data-el="hint"><span>' +
        '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>' +
      '</span></div>' +
      '<div class="pulse-end" data-el="end">' +
        '<span class="pulse-end-count" data-el="endcount"></span>' +
        '<h3>Keep going in InSnaps</h3>' +
        '<p>Endless, narrated, and tuned to your city — not just the three that fit here.</p>' +
        '<div class="pulse-end-actions">' +
          '<button class="pulse-end-open" data-el="endopen" type="button">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/></svg>' +
            '<span data-el="endlabel">Open in InSnaps</span>' +
          '</button>' +
          '<button class="pulse-end-replay" data-el="more" type="button">Show 4 more</button>' +
        '</div>' +
      '</div>' +
      '<div class="pulse-status" data-el="status"><div><div class="pulse-spinner"></div>Loading Pulse…</div></div>';

    this.el = {};
    ['progress', 'mute', 'slides', 'hint', 'end', 'endcount', 'endopen', 'endlabel', 'more', 'status']
      .forEach(function (k) { self.el[k] = r.querySelector('[data-el="' + k + '"]'); });

    this.el.mute.addEventListener('click', function (e) {
      e.stopPropagation();
      self.toggleMute();
    });
    this.el.more.addEventListener('click', function (e) {
      e.stopPropagation();
      self.more();
    });
    this.el.endopen.addEventListener('click', function (e) {
      e.stopPropagation();
      if (self.opts.onOpenApp) self.opts.onOpenApp(self.context());
    });
    r.addEventListener('click', function (e) {
      if (e.target.closest('button') || e.target.closest('a')) return;
      if (self.ended) return;
      self.togglePause();
    });

    // An autoplaying, talking card that follows you down the page is hostile.
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting && !self.paused && !self.ended) self._pause(true);
        });
      }, { threshold: 0.35 });
      this.io.observe(r);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && !self.paused && !self.ended) self._pause(true);
    });
  };

  /* Autoplay policy: speechSynthesis.speak() before any user gesture is
     ignored in Chrome and Safari. Rather than show a speaker-on icon over
     silence, listen once for the first interaction anywhere on the page and
     start the voice from wherever the caption has reached. */
  Pulse.prototype._armAudioGesture = function () {
    var self = this;
    if (this.audioArmed || this.muted || !speechSupported) return;
    this.audioArmed = true;

    function go() {
      off();
      if (self.muted || self.ended || self.paused || !self.current) return;
      // Already talking? nothing to do.
      if (self.current.spoke) return;
      self._startReel(self.index);
    }
    function off() {
      ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
        window.removeEventListener(ev, go, true);
      });
    }
    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
      window.addEventListener(ev, go, { capture: true, once: false, passive: true });
    });
  };

  Pulse.prototype.context = function () {
    var c = this.cards[this.index] || null;
    var topic = c ? (c.topic ? titleCase(c.topic) : (c.place || null)) : null;
    return {
      card: c,
      topic: topic,
      slug: c ? (c.slug || (topic ? slugify(topic) : null)) : null,
      index: this.index,
      total: Math.min(this.limit, this.cards.length)
    };
  };

  Pulse.prototype.load = function (cards, meta) {
    this.pool = (cards || []).slice();
    this.offset = 0;
    this.served = {};          // card ids already shown — never shown twice
    this.meta = meta || {};
    this._loadCards(this._take(this.limit));
  };

  /** Next `n` unseen cards from the pool, marking them served. */
  Pulse.prototype._take = function (n) {
    var out = [];
    while (this.offset < this.pool.length && out.length < n) {
      var c = this.pool[this.offset++];
      var key = c && (c.id || c.url || c.title);
      if (!key || this.served[key]) continue;
      this.served[key] = 1;
      out.push(c);
    }
    return out;
  };

  /** Extend the pool with cards we have not served yet. Returns how many stuck. */
  Pulse.prototype.addCards = function (cards) {
    var self = this, added = 0;
    (cards || []).forEach(function (c) {
      var key = c && (c.id || c.url || c.title);
      if (!key || self.served[key]) return;
      // Also skip anything already queued in the pool.
      for (var i = self.offset; i < self.pool.length; i++) {
        var p = self.pool[i];
        if (p && (p.id || p.url || p.title) === key) return;
      }
      self.pool.push(c);
      added++;
    });
    return added;
  };

  Pulse.prototype._loadCards = function (cards) {
    this.stop();
    this.cards = (cards || []).slice(0, this.limit);
    this.index = 0;
    this.typed = 0;
    this.ended = false;
    this.current = null;
    this.root.classList.remove('is-ended');

    if (!this.cards.length) {
      this.root.classList.remove('is-ready');
      this.el.status.innerHTML = '<div>' + escapeHtml(this.opts.emptyText || 'No stories here yet.') + '</div>';
      return;
    }

    this._renderSlides();
    this._renderProgress();
    this.root.classList.add('is-ready');
    this.play();
    this._prefetch();
  };

  Pulse.prototype._renderSlides = function () {
    var html = '';
    this.cards.forEach(function (c, i) {
      var seed = c.id || c.url || c.title || String(i);
      var tr = transitionFor(seed);
      var fx = fxFor(seed);
      var template = c.template ? TEMPLATE_PATH + c.template + '.webp' : templateFor(seed);
      var img = c.image || template;
      var tier = c.tier || 'world';
      var meta = [];
      if (c.source) meta.push('<span class="pulse-source">' + escapeHtml(c.source) + '</span>');
      var rel = relativeTime(c.publishedAt);
      if (rel) meta.push('<span>' + escapeHtml(rel) + '</span>');

      html +=
        '<div class="pulse-slide" data-i="' + i + '" data-template-only="' + (c.image ? '0' : '1') + '"' +
          ' style="--kb-from:' + tr.from + ';--kb-to:' + tr.to + ';--kb-origin:' + tr.origin + '">' +
          '<div class="pulse-backdrop" data-bg="' + escapeHtml(img) + '"></div>' +
          '<div class="pulse-image-wrap">' +
            '<img class="pulse-image" src="' + escapeHtml(img) + '" alt="" ' +
              'data-fallback="' + escapeHtml(template) + '" ' +
              'loading="' + (i === 0 ? 'eager' : 'lazy') + '" decoding="async">' +
          '</div>' +
          '<div class="pulse-scrim"></div>' +
          '<div class="pulse-fx">' + fxMarkup(fx) + '</div>' +
          '<div class="pulse-body">' +
            '<div class="pulse-kicker">' +
              '<span class="pulse-tier" data-tier="' + escapeHtml(tier) + '">' +
                escapeHtml(c.place || TIER_LABEL[tier] || tier) + '</span>' +
              (c.traffic ? '<span class="pulse-traffic">' + escapeHtml(c.traffic) + ' searches</span>' : '') +
            '</div>' +
            '<p class="pulse-caption"><span data-el="typed"></span><i class="pulse-caret"></i></p>' +
            '<div class="pulse-meta">' + meta.join('<span aria-hidden="true">·</span>') +
              (c.url ? ' <a href="' + escapeHtml(c.url) + '" target="_blank" rel="noopener nofollow">Read</a>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
    });
    this.el.slides.innerHTML = html;
    this.slides = Array.prototype.slice.call(this.el.slides.querySelectorAll('.pulse-slide'));

    // Backgrounds and the image fallback are wired here rather than inline, so
    // no URL ever has to survive being escaped into an attribute twice.
    this.slides.forEach(function (s) {
      var bd = s.querySelector('.pulse-backdrop');
      if (bd) bd.style.backgroundImage = 'url("' + bd.getAttribute('data-bg').replace(/"/g, '%22') + '")';
      var img = s.querySelector('.pulse-image');
      if (img) {
        img.addEventListener('error', function () {
          var fb = img.getAttribute('data-fallback');
          if (fb && img.src !== fb) {
            img.src = fb;
            s.setAttribute('data-template-only', '1');
            if (bd) bd.style.backgroundImage = 'url("' + fb + '")';
          }
        });
      }
    });
  };

  Pulse.prototype._renderProgress = function () {
    var html = '';
    for (var i = 0; i < this.cards.length; i++) {
      html += '<div class="pulse-progress-seg" data-i="' + i + '"><i></i></div>';
    }
    this.el.progress.innerHTML = html;
    this.segs = Array.prototype.slice.call(this.el.progress.querySelectorAll('.pulse-progress-seg'));
  };

  // ── playback ─────────────────────────────────────────────────────

  Pulse.prototype.play = function () {
    this.paused = false;
    this.root.classList.remove('is-paused');
    this._startReel(this.index);
  };

  Pulse.prototype._clearTimers = function () {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; }
  };

  Pulse.prototype.stop = function () {
    this.gen++;              // any in-flight callback is now stale
    this._clearTimers();
    cancelSpeech();
  };

  Pulse.prototype._startReel = function (i) {
    var self = this;
    var gen = ++this.gen;
    this._clearTimers();
    cancelSpeech();

    var card = this.cards[i];
    if (!card) return this._finish();

    this.typed = 0;

    this.slides.forEach(function (s, j) {
      s.classList.toggle('is-active', j === i);
      if (j !== i) s.removeAttribute('data-typed');
    });
    this.segs.forEach(function (s, j) {
      s.classList.remove('is-live');
      s.classList.toggle('is-done', j < i);
      if (j >= i) {
        var b0 = s.querySelector('i');
        b0.style.transition = 'none';
        b0.style.width = '0%';
      }
    });

    var slide = this.slides[i];
    var typedEl = slide.querySelector('[data-el="typed"]');
    typedEl.textContent = '';
    slide.removeAttribute('data-typed');

    // Caption shows headline (+ body when a source supplies one). Narration
    // additionally credits the publisher, exactly like the app.
    var headline = card.title || '';
    var body = card.body || '';
    var caption = body ? headline + '\n\n' + body : headline;
    var narration = buildNarration(headline, body, card.source);
    var estimated = estimateMs(narration);

    this.current = {
      i: i, slide: slide, typedEl: typedEl,
      caption: caption, narration: narration,
      estimated: estimated, started: false, gen: gen
    };

    // Motion and progress are both sized to the narration estimate, so voice,
    // typing and the bar all land together.
    var img = slide.querySelector('.pulse-image');
    if (img) {
      img.style.transform = '';
      img.style.setProperty('--kb-duration', estimated + 'ms');
    }
    this.segs[i].style.setProperty('--seg-duration', estimated + 'ms');

    if (this.opts.onReel) this.opts.onReel(this.context());

    if (!this.muted && speechSupported) {
      this._speak(narration, 0);
      // Safety net: if speech never reports a start, drive it on a timer so the
      // card cannot freeze silent (app: 1200ms _fallbackTimer).
      this.timers.push(setTimeout(function () {
        if (self.gen !== gen || !self.current || self.current.started) return;
        // Speech never started — almost always the autoplay block. Pace the
        // caption on a timer so nothing freezes, and wait for a gesture.
        self._silentPace(0);
        self._armAudioGesture();
      }, FALLBACK_MS));
    } else {
      this._silentPace(0);
    }
  };

  /** Run the progress bar from `fromRatio` (0-1) to full over `durMs`.
   *
   *  Driven entirely by inline styles. The CSS `.is-live > i { width: 100% }`
   *  rule cannot do it: _freeze() and the resume path both set an inline width,
   *  and an inline declaration outranks a class rule, so the bar would sit at
   *  whatever was last written and only appear to move when that value changed
   *  (i.e. on pause/resume) instead of animating continuously. */
  Pulse.prototype._beginBar = function (fromRatio, durMs) {
    if (!this.current) return;
    var seg = this.segs[this.current.i];
    if (!seg) return;
    var bar = seg.querySelector('i');
    var from = Math.max(0, Math.min(1, fromRatio || 0));
    var ms = Math.max(200, durMs || this.current.estimated);

    seg.classList.add('is-live');
    bar.style.transition = 'none';
    bar.style.width = (from * 100).toFixed(2) + '%';
    void bar.offsetWidth;                     // commit the start value
    bar.style.transition = 'width ' + ms + 'ms linear';
    // Next frame, so the browser has definitely painted the start width.
    requestAnimationFrame(function () {
      bar.style.width = '100%';
    });
  };

  /** Speak `text`; `charOffset` is where this text sits inside the full
   *  narration, so boundary events still map onto the whole caption. */
  Pulse.prototype._speak = function (text, charOffset) {
    var self = this;
    var gen = this.gen;                     // this utterance belongs to this reel
    var base = charOffset || 0;
    var full = this.current ? this.current.narration.length : text.length;
    var u = new window.SpeechSynthesisUtterance(text);
    function stale() { return self.gen !== gen; }
    // The app uses rate 0.52 on Flutter TTS, whose scale differs from the Web
    // Speech API's; 0.95 here matches the perceived pace.
    u.rate = 0.95;
    u.pitch = 1.0;

    u.onstart = function () {
      if (stale() || !self.current) return;
      self.current.started = true;
      self.current.spoke = true;      // real audio is playing
      var doneRatio = base / Math.max(1, full);
      self._beginBar(doneRatio, Math.max(400, Math.round(self.current.estimated * (1 - doneRatio))));
    };
    // App parity: type from the speech character offset, not a timer.
    u.onboundary = function (e) {
      if (stale() || !self.current || self.paused) return;
      if (typeof e.charIndex !== 'number') return;
      var ratio = Math.min(1, (base + e.charIndex) / Math.max(1, full));
      self._revealTo(Math.round(ratio * self.current.caption.length));
    };
    u.onend = function () {
      // Stale means we cancelled it on purpose; advancing here would double-step.
      if (stale() || !self.current || self.paused) return;
      self._revealTo(self.current.caption.length);
      self._advance();
    };
    u.onerror = function () {
      if (stale() || !self.current || self.current.started) return;
      self._silentPace(self.typed);
    };

    try {
      window.speechSynthesis.speak(u);
    } catch (_) {
      this._silentPace(this.typed);
    }
  };

  /** Timer-paced typing + bar: used when muted, or when speech never starts.
   *  Starts from the already-typed offset so it can resume, not restart. */
  Pulse.prototype._silentPace = function (fromChar) {
    var self = this;
    if (!this.current) return;
    var gen = this.gen;
    this.current.started = true;

    var total = this.current.caption.length;
    var shown = Math.max(0, Math.min(total, fromChar == null ? 0 : fromChar));
    var remaining = total - shown;
    // Time left is proportional to the characters left.
    var dur = Math.max(400, Math.round(this.current.estimated * (remaining / Math.max(1, total))));
    this._beginBar(shown / Math.max(1, total), dur);

    var step = Math.max(16, dur / Math.max(1, remaining));
    this.typeTimer = setInterval(function () {
      if (self.gen !== gen || !self.current || self.paused) return;
      shown += 1;
      self._revealTo(shown);
      if (shown >= total && self.typeTimer) {
        clearInterval(self.typeTimer);
        self.typeTimer = null;
      }
    }, step);

    this.timers.push(setTimeout(function () {
      if (self.gen !== gen || !self.current || self.paused) return;
      self._revealTo(total);
      self._advance();
    }, dur));
  };

  Pulse.prototype._revealTo = function (n) {
    var cur = this.current;
    if (!cur) return;
    n = Math.max(0, Math.min(cur.caption.length, n));
    if (n < this.typed) return;   // boundary events can arrive out of order
    this.typed = n;
    cur.typedEl.textContent = cur.caption.slice(0, n);
    if (n >= cur.caption.length) cur.slide.setAttribute('data-typed', '1');
  };

  Pulse.prototype._advance = function () {
    var self = this;
    var next = this.index + 1;
    // Invalidate the finishing reel first, so the onend that cancelSpeech()
    // triggers below is already stale and cannot advance a second time.
    var gen = ++this.gen;
    if (next >= Math.min(this.limit, this.cards.length)) return this._finish();

    var seg = this.segs[this.index];
    if (seg) seg.classList.add('is-done');
    this._clearTimers();
    cancelSpeech();
    // Hold a beat so two reels never run into each other.
    this.timers.push(setTimeout(function () {
      if (self.gen !== gen || self.paused || self.ended) return;
      self.index = next;
      self._startReel(next);
    }, REEL_GAP_MS));
  };

  Pulse.prototype._finish = function () {
    this.stop();
    this.ended = true;
    this.segs.forEach(function (s) {
      s.classList.add('is-done');
      s.classList.remove('is-live');
    });
    var n = Math.min(this.limit, this.cards.length);
    var left = Math.max(0, (this.pool || []).length - this.offset);
    this.el.endcount.textContent = left ? (left + ' more waiting') : 'more on the way';
    this.el.more.disabled = false;
    this.el.more.textContent = 'Show ' + this.limit + ' more';
    var ctx = this.context();
    this.el.endlabel.textContent = ctx.topic
      ? 'Open ' + ctx.topic + ' in InSnaps'
      : 'Open in InSnaps';
    this.root.classList.add('is-ended');
    if (this.opts.onEnd) this.opts.onEnd(ctx);
  };

  // ── controls ─────────────────────────────────────────────────────

  Pulse.prototype.togglePause = function () {
    if (this.paused) this._resume(); else this._pause(false);
  };

  Pulse.prototype._pause = function (silent) {
    var self = this;
    if (this.paused || this.ended) return;
    this.paused = true;
    this.root.classList.add('is-paused');
    this._freeze();
    this.gen++;              // stop the cancelled utterance from advancing
    this._clearTimers();
    cancelSpeech();
    if (!silent) {
      this.el.hint.classList.add('is-shown');
      if (this.hintTimer) clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(function () {
        self.el.hint.classList.remove('is-shown');
      }, PAUSE_HINT_MS);
    }
    if (this.opts.onPause) this.opts.onPause(this.context());
  };

  /** Freeze the bar and the Ken Burns transform at their current values. */
  Pulse.prototype._freeze = function () {
    if (!this.current) return;
    var seg = this.segs[this.current.i];
    if (seg) {
      var bar = seg.querySelector('i');
      var w = bar.getBoundingClientRect().width;
      var parentW = seg.getBoundingClientRect().width || 1;
      bar.style.transition = 'none';
      bar.style.width = (w / parentW * 100).toFixed(2) + '%';
    }
    var img = this.current.slide.querySelector('.pulse-image');
    if (img) {
      var t = getComputedStyle(img).transform;
      if (t && t !== 'none') img.style.transform = t;
    }
  };

  /** Continue the current reel from where it stopped — not from the top.
   *  speechSynthesis.pause()/resume() is unreliable across browsers, so the
   *  remaining narration is re-spoken from the matching character offset
   *  instead, and the caption/bar/motion pick up from their frozen values. */
  Pulse.prototype._resume = function () {
    var self = this;
    if (!this.paused || !this.current) return;
    this.paused = false;
    this.root.classList.remove('is-paused');
    this.el.hint.classList.remove('is-shown');

    var cur = this.current;
    var typed = this.typed;
    var capLen = Math.max(1, cur.caption.length);

    if (typed >= cur.caption.length) {
      // Caption already finished; just move on.
      this._advance();
      return;
    }

    // Let the Ken Burns transition run again toward its end value over the
    // time that is left.
    var img = cur.slide.querySelector('.pulse-image');
    var doneRatio = typed / capLen;
    var msLeft = Math.max(400, Math.round(cur.estimated * (1 - doneRatio)));
    if (img) {
      img.style.setProperty('--kb-duration', msLeft + 'ms');
      // Clearing the inline transform hands control back to the CSS rule,
      // which animates from the frozen value to --kb-to.
      requestAnimationFrame(function () { img.style.transform = ''; });
    }

    cur.started = false;
    if (!this.muted && speechSupported) {
      var offset = Math.min(cur.narration.length - 1,
        Math.max(0, Math.round(doneRatio * cur.narration.length)));
      // Resume on a word boundary so the voice does not clip mid-syllable.
      var sp = cur.narration.indexOf(' ', offset);
      if (sp === -1 || sp - offset > 24) sp = offset;
      var rest = cur.narration.slice(sp).replace(/^\s+/, '');
      if (!rest) { this._advance(); return; }
      this._speak(rest, sp);
      this.timers.push(setTimeout(function () {
        if (!self.current || self.current.started || self.paused) return;
        self._silentPace(self.typed);
      }, FALLBACK_MS));
    } else {
      this._silentPace(typed);
    }
    if (this.opts.onResume) this.opts.onResume(this.context());
  };

  Pulse.prototype.toggleMute = function () {
    this.muted = !this.muted;
    this.root.setAttribute('data-muted', this.muted ? '1' : '0');
    if (this.opts.onMute) this.opts.onMute(this.muted, this.context());
    if (this.ended) return;
    this._startReel(this.index);   // restart so narration starts/stops cleanly
  };

  /** Play the next unseen batch. Never repeats a story: the pool is consumed
   *  forward-only and every served id is remembered. When it runs dry the host
   *  is asked to top it up (opts.onNeedMore), so the button keeps working
   *  without ever showing the same headline twice. */
  Pulse.prototype.more = function () {
    var self = this;
    var next = this._take(this.limit);
    if (next.length === this.limit) {
      if (this.opts.onMore) this.opts.onMore(this.served);
      this._loadCards(next);
      this._prefetch();
      return;
    }

    // Not enough left — ask for more, then continue with whatever we can get.
    var ask = this.opts.onNeedMore;
    var finish = function () {
      var more = self._take(self.limit - next.length);
      var batch = next.concat(more);
      if (!batch.length) {
        self.el.more.disabled = true;
        self.el.more.textContent = 'That is everything for now';
        return;
      }
      if (self.opts.onMore) self.opts.onMore(self.served);
      self._loadCards(batch);
    };

    if (typeof ask === 'function') {
      this.el.more.disabled = true;
      this.el.more.textContent = 'Loading…';
      Promise.resolve(ask()).then(function () {
        self.el.more.disabled = false;
        self.el.more.textContent = 'Show ' + self.limit + ' more';
        finish();
      }).catch(function () {
        self.el.more.disabled = false;
        self.el.more.textContent = 'Show ' + self.limit + ' more';
        finish();
      });
    } else {
      finish();
    }
  };

  /** Warm the next batch's images while the current one plays. */
  Pulse.prototype._prefetch = function () {
    var upcoming = (this.pool || []).slice(this.offset, this.offset + this.limit);
    upcoming.forEach(function (c) {
      var src = c && (c.image || (c.template ? TEMPLATE_PATH + c.template + '.webp' : null));
      if (!src) return;
      var img = new Image();
      img.decoding = 'async';
      img.src = src;
    });
  };

  Pulse.prototype.replay = function () {
    this.ended = false;
    this.root.classList.remove('is-ended');
    this.index = 0;
    this.typed = 0;
    this.segs.forEach(function (s) {
      s.classList.remove('is-done', 'is-live');
      var b1 = s.querySelector('i');
      b1.style.transition = 'none';
      b1.style.width = '0%';
    });
    this.play();
    if (this.opts.onReplay) this.opts.onReplay();
  };

  Pulse.prototype.setLoading = function (text) {
    this.stop();
    this.current = null;
    this.root.classList.remove('is-ready', 'is-ended');
    this.el.status.innerHTML = '<div><div class="pulse-spinner"></div>' +
      escapeHtml(text || 'Loading…') + '</div>';
  };

  // ── public API ───────────────────────────────────────────────────

  window.InSnapsPulse = {
    mount: function (el, options) { return new Pulse(el, options); },
    titleCase: titleCase,
    templateFor: templateFor,
    slugify: slugify,
    relativeTime: relativeTime,
    speechSupported: speechSupported
  };
})();
