/* The live card system — shared by /live/ and the homepage's blend section.
 *
 * Extracted from live/index.html so the two surfaces render identical cards
 * from one implementation. Eight layouts, picked deterministically from the
 * card id so a given story always looks the same, with photo-bearing stories
 * steered onto layouts that can show an image and template-only stories
 * steered off them.
 *
 *   window.InSnapsLiveCards.normalize(raw, tier, extra) -> card
 *   window.InSnapsLiveCards.cardHtml(card, eager)       -> HTML string
 *   window.InSnapsLiveCards.render(el, cards, opts)     -> paints + wires
 *   window.InSnapsLiveCards.restamp(el)                 -> refresh "2h ago"
 */
(function () {
  'use strict';

  var TEMPLATE_PATH = '/assets/pulse/';
  var LAYOUTS = ['fullbleed', 'bold', 'glass', 'newspaper', 'gradient', 'compact', 'magazine', 'neon'];
  var TEXT_ONLY = { bold: 1, gradient: 1 };
  var TIER_LABEL = { local: 'Local', national: 'National', world: 'World', trending: 'Trending' };

  // Math.imul: the product exceeds 2^53, so a plain multiply would lose
  // precision and diverge from the Python build script and the Flutter app.
  function fnv1a(s) {
    var h = 0x811c9dc5;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function layoutFor(id) { return LAYOUTS[fnv1a(id) % LAYOUTS.length]; }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function relativeTime(iso) {
    if (!iso) return '';
    var t = Date.parse(iso);
    if (isNaN(t)) return '';
    var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var h = Math.round(mins / 60);
    if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  function safeUrl(u) {
    u = String(u || '');
    return /^https?:\/\//i.test(u) ? u : '#';
  }

  function templateFor(c) {
    if (c && c.template && /^bt_\d\d$/.test(c.template)) return TEMPLATE_PATH + c.template + '.webp';
    return TEMPLATE_PATH + 'bt_' + String((fnv1a(c && c.id) % 44) + 1).padStart(2, '0') + '.webp';
  }

  /** Turn a raw feed card into the shape the renderer wants. */
  function normalize(c, tier, extra) {
    if (!c || !c.title) return null;
    var out = {
      id: c.id || c.url || c.title,
      title: c.title,
      source: c.source || '',
      url: safeUrl(c.url),
      publishedAt: c.publishedAt || null,
      ts: c.publishedAt ? (Date.parse(c.publishedAt) || 0) : 0,
      image: c.image || null,
      template: templateFor(c),
      traffic: c.traffic || null,
      tier: tier || c.tier || 'world',
      place: null
    };
    if (extra) {
      if (extra.place) out.place = extra.place;
    }
    if (!out.place && c.place) out.place = c.place;
    return out;
  }

  // ── pieces ───────────────────────────────────────────────────────

  function tierBadge(c) {
    var label = (c.tier === 'local' || c.tier === 'national')
      ? (c.place || TIER_LABEL[c.tier] || c.tier)
      : (TIER_LABEL[c.tier] || c.tier);
    return '<span class="live-tier" data-tier="' + escapeHtml(c.tier) + '">' + escapeHtml(label) + '</span>';
  }

  function kicker(c) {
    return '<div class="live-kicker">' + tierBadge(c) +
      (c.traffic ? '<span class="live-traffic">' + escapeHtml(c.traffic) + ' searches</span>' : '') +
      '</div>';
  }

  var OUT_ICON = '<span class="live-out" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" ' +
    'stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>' +
    '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></span>';

  function metaRow(c) {
    var bits = [];
    if (c.source) bits.push('<span class="live-source">' + escapeHtml(c.source) + '</span>');
    var rel = relativeTime(c.publishedAt);
    if (rel) bits.push('<span class="live-time" data-at="' + escapeHtml(c.publishedAt) + '">' + escapeHtml(rel) + '</span>');
    return '<div class="live-meta">' + bits.join('<span class="live-sep" aria-hidden="true">&middot;</span>') + OUT_ICON + '</div>';
  }

  function media(c, eager) {
    var src = c.image || c.template;
    return '<div class="live-media"><img src="' + escapeHtml(src) + '" alt="" ' +
      'data-fallback="' + escapeHtml(c.template) + '" ' +
      'loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async"></div>';
  }

  function title(c) { return '<h3 class="live-title">' + escapeHtml(c.title) + '</h3>'; }

  /* `allowTemplateArt` lets image-less stories keep the photo layouts, filled
     with their deterministic breaking template — the same artwork the app uses
     for image-less articles. /live/ leaves it off so a long wall does not turn
     into rows of stock graphics; the homepage turns it on, because there the mix
     is mostly local and national stories, which carry no photography at all and
     would otherwise render as a block of plain text. */
  function pickLayout(c, allowTemplateArt) {
    var l = layoutFor(c.id);
    if (!c.image && !allowTemplateArt && (l === 'fullbleed' || l === 'magazine' || l === 'glass')) {
      l = LAYOUTS[fnv1a('t' + c.id) % 2 === 0 ? 1 : 4];   // bold | gradient
    }
    if (c.image && TEXT_ONLY[l]) l = 'compact';
    return l;
  }

  function cardHtml(c, eager, layoutOverride, allowTemplateArt) {
    var layout = layoutOverride || pickLayout(c, allowTemplateArt);
    var inner;
    if (layout === 'fullbleed' || layout === 'glass' || layout === 'compact') {
      inner = media(c, eager) + '<div class="live-body">' + kicker(c) + title(c) + metaRow(c) + '</div>';
    } else if (layout === 'newspaper') {
      var slug = [(c.place || TIER_LABEL[c.tier] || ''), c.source].filter(Boolean).join(' — ');
      inner = '<div class="live-rule"></div>' +
        '<div class="live-slugline">' + escapeHtml(slug) + '</div>' +
        title(c) + (c.image ? media(c, eager) : '') + metaRow(c);
    } else if (layout === 'magazine') {
      inner = '<div class="live-mediawrap">' + kicker(c) + media(c, eager) + '</div>' +
        '<div class="live-body">' + title(c) + metaRow(c) + '</div>';
    } else if (layout === 'neon') {
      inner = (c.image ? media(c, eager) : '') + kicker(c) + title(c) + metaRow(c);
    } else {
      // bold / gradient — typography only, no image slot
      inner = kicker(c) + title(c) + metaRow(c);
    }
    return '<a class="live-card" data-layout="' + layout + '" data-tier="' + escapeHtml(c.tier) + '" ' +
      'data-id="' + escapeHtml(c.id) + '" href="' + escapeHtml(c.url) + '" ' +
      'target="_blank" rel="noopener nofollow">' + inner + '</a>';
  }

  /** A broken remote image (Google's thumbnails expire) falls back to the
   *  deterministic breaking template rather than an empty box. */
  function wireImages(scope) {
    var imgs = scope.querySelectorAll('img[data-fallback]');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        img.addEventListener('error', function () {
          var fb = img.getAttribute('data-fallback');
          if (fb && img.getAttribute('src') !== fb) img.setAttribute('src', fb);
        });
      })(imgs[i]);
    }
  }

  function render(el, cards, opts) {
    if (!el) return;
    opts = opts || {};
    var eagerCount = opts.eager == null ? 3 : opts.eager;
    el.innerHTML = (cards || []).map(function (c, i) {
      return cardHtml(c, i < eagerCount, null, opts.allowTemplateArt);
    }).join('');
    wireImages(el);
    if (opts.onClick) {
      var links = el.querySelectorAll('a.live-card');
      for (var i = 0; i < links.length; i++) {
        (function (a) {
          a.addEventListener('click', function () { opts.onClick(a); });
        })(links[i]);
      }
    }
  }

  /** Re-stamp the relative times in place (call on an interval). */
  function restamp(el) {
    var times = (el || document).querySelectorAll('.live-time');
    for (var i = 0; i < times.length; i++) {
      var rel = relativeTime(times[i].getAttribute('data-at'));
      if (rel) times[i].textContent = rel;
    }
  }

  window.InSnapsLiveCards = {
    normalize: normalize,
    cardHtml: cardHtml,
    pickLayout: pickLayout,
    render: render,
    restamp: restamp,
    wireImages: wireImages,
    relativeTime: relativeTime,
    layouts: LAYOUTS,
    tierLabel: TIER_LABEL
  };
})();
