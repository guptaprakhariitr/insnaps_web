/* Homepage: wires the Pulse hero, the town-coverage search, and the blend
 * sliders to the static data in /_data/live/.
 *
 * The blend sliders mirror the app's own preferences (user_settings_service.dart):
 *   newsScope 0.0 = all local … 1.0 = all global
 *   newsDepth 0.0 = quick bites … 1.0 = deep dive
 * and the local/national 3x feed boost from feed_domain_affinity.dart, so the
 * wall re-weights the way the app's feed actually does.
 */
(function () {
  'use strict';

  var DATA = '/_data/live/';
  var LOCAL_BOOST = 3.0;   // app: FeedDomainAffinity.localNationalFeedScoreMultiplier
  var WALL_SIZE = 18;   // 15-20 stories, ~6 rows of 3 on desktop
  // rss2json is the only way to read a feed from the browser, and its free tier
  // throttles, so live lookups are capped hard. Pre-baked towns never hit it.
  var LIVE_LOOKUP_CAP = 4;
  var liveLookups = 0;

  function $(sel, root) { return (root || document).querySelector(sel); }

  /* slugify() now folds accents itself (shared table with the app), so the
     pre-baked lookup can use it directly. */
  function asciiSlug(text) { return window.InSnapsPulse.slugify(text); }

  function debounce(fn, ms) {
    var t = null;
    return function () { clearTimeout(t); t = setTimeout(fn, ms); };
  }

  function track(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status + ' ' + url);
      return r.json();
    });
  }

  /* Country from the browser's timezone — no network call, no permission
     prompt, and no IP-geolocation service to depend on. */
  var TZ_COUNTRY = {
    'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
    'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
    'Europe/London': 'GB', 'Europe/Dublin': 'GB',
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Pacific/Auckland': 'AU',
    'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
    'America/Winnipeg': 'CA', 'America/Halifax': 'CA',
    'Asia/Dubai': 'AE', 'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'SG',
    'Asia/Jakarta': 'SG', 'Asia/Manila': 'SG', 'Asia/Bangkok': 'SG',
    'Africa/Johannesburg': 'ZA', 'Africa/Lagos': 'ZA', 'Africa/Nairobi': 'ZA',
    'Africa/Accra': 'ZA'
  };

  function detectCountry() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
      // Fall back to the region of the browser locale (en-IN -> IN).
      var loc = (navigator.language || '').split('-')[1];
      if (loc && loc.length === 2) return loc.toUpperCase();
    } catch (_) {}
    return 'US';
  }

  var COUNTRY_NAME = {
    IN: 'India', US: 'the United States', GB: 'the United Kingdom', AU: 'Australia',
    CA: 'Canada', AE: 'the UAE', SG: 'Singapore', ZA: 'South Africa'
  };

  // ── state ────────────────────────────────────────────────────────

  var store = { world: [], national: [], trending: [], local: [], place: null, cc: 'US', townIndex: null };
  var pulse = null;
  var scope = 0.5;   // app default
  var depth = 0.5;

  // ── boot ─────────────────────────────────────────────────────────

  function init() {
    var stageEl = $('#pulseStage');
    if (!stageEl || !window.InSnapsPulse) return;

    store.cc = detectCountry();

    // The gate hides the page with opacity but does not stop anything behind
    // it, so hold playback until a city has been chosen.
    var gated = !!(window.InSnapsCity && window.InSnapsCity.gateOpen && window.InSnapsCity.gateOpen());

    pulse = window.InSnapsPulse.mount(stageEl, {
      limit: 4,
      autoplay: !gated,
      emptyText: 'Live stories are refreshing — check back in a minute.',
      onReel: function (ctx) {
        track('pulse_reel_view', { index: ctx.index, topic: ctx.slug || 'none', place: store.place || 'none' });
        syncBar(ctx);
      },
      onEnd: function (ctx) {
        track('pulse_deck_complete', { total: ctx.total, place: store.place || 'none' });
        syncBar(ctx);
      },
      onOpenApp: function (ctx) {
        track('pulse_open_app', { topic: ctx.slug || 'none', place: store.place || 'none' });
        if (window.InSnapsViewBar) window.InSnapsViewBar.openApp(ctx.slug);
      },
      onMute: function (muted) { track('pulse_mute_toggle', { muted: muted }); },
      onPause: function () { track('pulse_pause', {}); },
      onMore: function () { track('pulse_show_more', {}); },
      // Re-pull the snapshot and hand over anything not shown yet, so "show
      // more" always advances instead of looping back to the first story.
      onNeedMore: function () {
        return Promise.all([
          getJSON(DATA + 'pulse.json').catch(function () { return null; }),
          getJSON(DATA + 'world.json').catch(function () { return null; }),
          getJSON(DATA + 'trending.json').catch(function () { return null; })
        ]).then(function (res) {
          var fresh = [];
          if (res[0] && res[0].cards) fresh = fresh.concat(res[0].cards);
          if (res[1] && res[1].cards) fresh = fresh.concat(res[1].cards);
          if (res[2] && res[2].geos) {
            var g = res[2].geos[store.cc] || res[2].geos.US || [];
            fresh = fresh.concat(g);
          }
          if (hasCity()) fresh = store.local.concat(store.national, fresh);
          var added = pulse.addCards(fresh);
          track('pulse_topped_up', { added: added });
        });
      }
    });

    if (window.InSnapsCity && window.InSnapsCity.onGateClose) {
      window.InSnapsCity.onGateClose(function () {
        // A city pick reloads the deck via onChange; this covers the case where
        // the deck is already loaded and just needs to begin.
        if (pulse && !pulse.cards.length) return;
        pulse.start();
      });
    }

    if (window.InSnapsViewBar) {
      window.InSnapsViewBar.mount({
        label: 'Open InSnaps',
        sub: 'Narrated, endless, tuned to your city'
      });
    }

    wireChrome();
    wireTown();
    wireSliders();
    loadBase();

    // A city chosen on any page carries over.
    var saved = window.InSnapsCity && window.InSnapsCity.get();
    if (saved) {
      var inp = $('#hpTownInput');
      if (inp) inp.value = saved.label;
      selectCity(saved, $('#hpTownBtn'));
    }
  }

  function syncBar(ctx) {
    if (!window.InSnapsViewBar) return;
    var topic = store.place || (ctx && ctx.topic) || null;
    window.InSnapsViewBar.set({
      topic: topic,
      slug: topic ? window.InSnapsPulse.slugify(topic) : null,
      sub: store.place
        ? 'Your city ranked 3× higher, in the app'
        : 'Narrated, endless, tuned to your city'
    });
  }

  // ── base data ────────────────────────────────────────────────────

  function loadBase() {
    var cc = store.cc;
    Promise.all([
      getJSON(DATA + 'pulse.json').catch(function () { return null; }),
      getJSON(DATA + 'world.json').catch(function () { return null; }),
      getJSON(DATA + 'countries.json').catch(function () { return null; }),
      getJSON(DATA + 'trending.json').catch(function () { return null; }),
      getJSON(DATA + 'towns-index.json').catch(function () { return null; })
    ]).then(function (res) {
      var pulseData = res[0], world = res[1], countries = res[2], trending = res[3], towns = res[4];

      store.world = (world && world.cards) || [];
      store.national = (countries && countries.countries && (countries.countries[cc] || countries.countries.US)) || [];
      store.trending = (trending && trending.geos && (trending.geos[cc] || trending.geos.US)) || [];
      store.townIndex = (towns && towns.towns) || null;

      var deck = (pulseData && pulseData.cards) || store.trending.concat(store.world);
      if (deck.length) pulse.load(deck);
      else pulse.load([]);

      stampUpdated((pulseData && pulseData.generatedAt) || (world && world.generatedAt));
      renderCountryHint();
      renderWall();
    }).catch(function () {
      pulse.load([]);
      renderWall();
    });
  }

  function stampUpdated(iso) {
    var el = $('#hpUpdated');
    if (!el) return;
    var rel = window.InSnapsPulse.relativeTime(iso);
    el.textContent = rel ? 'Live · updated ' + rel : 'Live';
  }

  function renderCountryHint() {
    var el = $('#hpCountry');
    if (!el) return;
    // Prefer the name the city picker gave us; the built-in map only covers the
    // countries we pre-build national tiers for.
    el.textContent = COUNTRY_NAME[store.cc] || store.countryName || 'your country';
  }

  // ── town search ──────────────────────────────────────────────────

  /* Measure everything fixed around the hero — app banner, navbar, ticker,
     the sub-ticker strip and the bottom view-in-app bar — and publish it as
     --chrome-h. The hero targets `100svh - chrome`, so the whole first view
     lands inside one screen at any width or height. svh (not vh) so mobile
     browser chrome is accounted for. */
  function wireChrome() {
    var root = document.documentElement;

    function measure() {
      var h = 0;
      ['.app-banner', '.navbar', '.news-ticker', '.sources-strip', '.viewbar'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        // A fixed element translated off-screen (the banner before it shows)
        // occupies no space.
        if (cs.position === 'fixed' && /matrix|translate/.test(cs.transform)) {
          var r = el.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= window.innerHeight) return;
        }
        h += el.getBoundingClientRect().height;
      });
      root.style.setProperty('--chrome-h', Math.round(h) + 'px');
    }

    measure();
    window.addEventListener('resize', debounce(measure, 120), { passive: true });
    window.addEventListener('orientationchange', function () { setTimeout(measure, 250); });
    // The banner and the bottom bar appear after a beat; re-measure when they do.
    if ('MutationObserver' in window) {
      var mo = new MutationObserver(debounce(measure, 80));
      ['.app-banner', '.viewbar'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) mo.observe(el, { attributes: true, attributeFilter: ['class', 'style'] });
      });
      mo.observe(document.body, { childList: true });
    }
    setTimeout(measure, 900);
    setTimeout(measure, 2500);
  }

  /* The city combobox and all persistence live in city.js, so the hero field,
     the navbar chip and every other page share one implementation and one
     stored value. Free text is deliberately not accepted — see city.js. */
  function wireTown() {
    var form = $('#hpTownForm');
    var input = $('#hpTownInput');
    var btn = $('#hpTownBtn');
    var list = $('#hpTownList');
    if (!form || !input || !list || !window.InSnapsCity) return;

    var ac = window.InSnapsCity.attach(input, list, function (city) {
      selectCity(city, btn);
    }, { flip: true });

    // The button opens/refreshes suggestions; it never searches raw text,
    // because a bare name cannot identify a city (same name, other country).
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value.trim().length < 2) { input.focus(); return; }
      ac.run();
      input.focus();
    });

    document.addEventListener('click', function (e) {
      if (!form.contains(e.target)) ac.close();
    });

    var chips = document.querySelectorAll('#hpTownChips .hp-chip');
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        // Chips are known places, so resolve them through the same geocoder
        // rather than trusting the label — that way the country is real.
        var place = chip.getAttribute('data-place') || chip.textContent.trim();
        Array.prototype.forEach.call(chips, function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        input.value = place;
        ac.close();
        if (btn) btn.disabled = true;
        pulse.setLoading('Finding ' + place + '…');
        window.InSnapsCity.search(place).then(function (items) {
          if (btn) btn.disabled = false;
          if (items.length) {
            window.InSnapsCity.set(items[0]);
            input.value = items[0].label;
            selectCity(items[0], btn);
          } else {
            applyTownMiss(place, window.InSnapsPulse.slugify(place));
          }
        });
      });
    });

    // Reflect a city chosen anywhere else on the site (navbar chip, other page).
    window.InSnapsCity.onChange(function (city) {
      if (!city) { store.place = null; store.local = []; renderWall(); return; }
      if (city.city === store.place) return;
      input.value = city.label;
      selectCity(city, btn);
    });
  }

  /** A resolved city from the picker: remember its country, then load reels. */
  function selectCity(city, btn) {
    store.cc = city.cc || store.cc;
    store.countryName = city.country || null;
    store.cityLabel = city.label || city.city;
    renderCountryHint();
    track('city_selected', { city: city.city, cc: city.cc || 'none', state: city.state || 'none' });
    lookupTown(city.city, btn);
  }

  function lookupTown(place, btn) {
    var slug = window.InSnapsPulse.slugify(place);
    if (!slug) return;
    if (btn) btn.disabled = true;
    pulse.setLoading('Finding ' + place + '…');
    track('town_search', { place: place, slug: slug });

    finishTown(place, slug, btn);
  }

  function finishTown(place, slug, btn) {
    // Pre-baked first: instant, and it never touches a third-party proxy.
    getJSON(DATA + 'towns/' + asciiSlug(place) + '.json')
      .then(function (t) {
        if (!t || !t.cards || !t.cards.length) throw new Error('empty');
        applyTown(place, slug, t.cards, 'prebaked');
      })
      .catch(function () {
        return liveTownLookup(place, slug);
      })
      .catch(function () {
        applyTownMiss(place, slug);
      })
      .then(function () { if (btn) btn.disabled = false; });
  }

  /* Live fallback for a town we have not pre-baked. Google News RSS is not
     CORS-readable, so this goes through the same public proxy the blog cards
     use — capped, because its free tier throttles. */
  function liveTownLookup(place, slug) {
    if (liveLookups >= LIVE_LOOKUP_CAP) {
      track('town_live_capped', { place: place });
      return Promise.reject(new Error('capped'));
    }
    liveLookups++;
    var hl = 'en-' + store.cc, ceid = store.cc + ':en';
    var feed = 'https://news.google.com/rss/search?q=' + encodeURIComponent(place) +
      '&hl=' + hl + '&gl=' + store.cc + '&ceid=' + ceid;
    var url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed);

    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.status !== 'ok' || !d.items || !d.items.length) throw new Error('no items');
      var cards = d.items.slice(0, 8).map(function (it) {
        var title = String(it.title || '');
        var source = String(it.author || '').trim();
        // Google News suffixes " - Publisher"; recover it when author is blank.
        var m = title.match(/\s+-\s+([^-]{2,40})$/);
        if (!source && m) source = m[1].trim();
        if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
        return {
          id: null,
          title: title.trim(),
          source: source || 'Google News',
          url: it.link || '',
          publishedAt: it.pubDate ? new Date(it.pubDate.replace(' ', 'T') + 'Z').toISOString() : null,
          image: null,
          template: null,
          tier: 'local',
          place: place
        };
      }).filter(function (c) { return c.title.length > 12 && c.url; });
      if (!cards.length) throw new Error('no usable items');
      applyTown(place, slug, cards, 'live');
    });
  }

  function applyTown(place, slug, cards, via) {
    store.place = place;
    store.local = cards;
    pulse.load(cards);
    track('town_result', { place: place, slug: slug, via: via, count: cards.length });
    var note = $('#hpTownHint');
    if (note) {
      var shown = store.cityLabel || place;
      note.innerHTML = 'Showing <b>' + escapeHtml(shown) + '</b> — ' + cards.length +
        ' stories, from the same sources the app reads.';
    }
    renderWall();
    syncBar({ topic: place, slug: slug });
  }

  function applyTownMiss(place, slug) {
    store.place = null;
    store.local = [];
    var note = $('#hpTownHint');
    if (note) {
      note.innerHTML = 'No live coverage for <b>' + escapeHtml(place) +
        '</b> from here right now. The app keeps looking — try another place, or open it in InSnaps.';
    }
    pulse.load(store.trending.concat(store.world).slice(0, 3));
    track('town_miss', { place: place, slug: slug });
    renderWall();
  }

  // ── blend sliders ────────────────────────────────────────────────

  function wireSliders() {
    var s = $('#hpScope'), d = $('#hpDepth');
    if (!s || !d) return;
    scope = parseFloat(s.value);
    depth = parseFloat(d.value);
    var commit = debounce(function () {
      track('blend_change', { scope: Math.round(scope * 100), depth: Math.round(depth * 100) });
    }, 700);
    s.addEventListener('input', function () { scope = parseFloat(s.value); renderWall(); commit(); });
    d.addEventListener('input', function () { depth = parseFloat(d.value); renderWall(); commit(); });
    renderWall();
  }

  /* Tier weights from the scope slider. desiredLocality = 1 - newsScope and the
     per-tier match is 1 - |anchor - desiredLocality|, matching
     FeedDomainAffinity.scopeMatch. The 3x boost is applied to the local tier,
     which is what makes local outweigh world at a balanced setting.

     Note: the app boosts local *and* national stored scores. Boosting both here
     would make national swamp the middle of the slider and bury the
     local-vs-world story the control exists to show, so only local carries the
     boost in this visualisation. The numbers are a share of the list, not the
     app's raw multiplier.

     If no city is set there is genuinely no local news to show, so the local
     tier is dropped from the weighting entirely rather than claiming a share it
     cannot fill. */
  var ANCHOR = { local: 1.0, national: 0.5, world: 0.0 };

  /* Without a chosen city we know neither the city nor the country, so neither
     the local nor the national tier can be filled honestly — the country was
     only ever a timezone guess. Until a city is set the mix is world-only, and
     the two other tiers are shown as locked rather than filled with a guess. */
  function hasCity() { return !!(store.place && store.local.length); }

  function tierWeights() {
    if (!hasCity()) return { local: 0, national: 0, world: 1 };
    var desiredLocality = Math.max(0, Math.min(1, 1 - scope));
    var w = {
      local: (1 - Math.abs(ANCHOR.local - desiredLocality)) * LOCAL_BOOST,
      national: (1 - Math.abs(ANCHOR.national - desiredLocality)),
      world: (1 - Math.abs(ANCHOR.world - desiredLocality))
    };
    // Floor local so it stays represented even at full global — the visible
    // consequence of the 3x boost, and the point of the control.
    w.local = Math.max(w.local, 0.26);
    var sum = w.local + w.national + w.world || 1;
    return { local: w.local / sum, national: w.national / sum, world: w.world / sum };
  }

  function renderMix(weights) {
    var bar = $('#hpMixBar');
    if (bar) {
      bar.querySelector('.hp-mix-local').style.width = (weights.local * 100).toFixed(1) + '%';
      bar.querySelector('.hp-mix-national').style.width = (weights.national * 100).toFixed(1) + '%';
      bar.querySelector('.hp-mix-world').style.width = (weights.world * 100).toFixed(1) + '%';
    }
    var read = $('#hpMixRead');
    if (read) {
      var parts = [];
      if (weights.local > 0.005) parts.push(Math.round(weights.local * 100) + '% local');
      if (weights.national > 0.005) parts.push(Math.round(weights.national * 100) + '% national');
      parts.push(Math.round(weights.world * 100) + '% world');
      read.textContent = parts.join(' · ');
    }
    var lLocal = $('#hpLegendLocal'), lNat = $('#hpLegendNational');
    if (lLocal) lLocal.hidden = !hasCity();
    if (lNat) lNat.hidden = !hasCity();

    // The sliders only mean something once there are tiers to blend.
    var controls = $('#hpControls');
    if (controls) controls.classList.toggle('is-locked', !hasCity());

    var sv = $('#hpScopeValue');
    if (sv) sv.textContent = !hasCity() ? 'Set your city'
      : scope <= 0.15 ? 'My city'
      : scope <= 0.4 ? 'Mostly local'
      : scope <= 0.6 ? 'Balanced'
      : scope <= 0.85 ? 'Mostly world' : 'The world';
    var dv = $('#hpDepthValue');
    if (dv) dv.textContent = depth <= 0.2 ? 'Quick bites'
      : depth <= 0.45 ? 'Light'
      : depth <= 0.6 ? 'Balanced'
      : depth <= 0.8 ? 'In depth' : 'Deep dive';
  }

  function renderWall() {
    var weights = tierWeights();
    renderMix(weights);

    var wall = $('#hpWall');
    if (!wall) return;

    var slots = {
      local: Math.round(weights.local * WALL_SIZE),
      national: Math.round(weights.national * WALL_SIZE),
      world: Math.round(weights.world * WALL_SIZE)
    };
    /* Interleave trends into the world pool. Google News search carries no
       imagery, trends do — appending them meant the 24 text-only world cards
       always won the slots and the wall came out almost pictureless. */
    var worldPool = [];
    var wi = 0, ti = 0;
    while (wi < store.world.length || ti < store.trending.length) {
      if (ti < store.trending.length) worldPool.push(store.trending[ti++]);
      if (wi < store.world.length) worldPool.push(store.world[wi++]);
    }
    var pools = {
      local: hasCity() ? store.local : [],
      national: hasCity() ? store.national : [],
      world: worldPool
    };

    var picked = [];
    ['local', 'national', 'world'].forEach(function (tier) {
      var pool = pools[tier];
      var n = Math.min(slots[tier], pool.length);
      for (var i = 0; i < n; i++) picked.push(pool[i]);
    });
    if (picked.length < WALL_SIZE) {
      pools.world.concat(pools.national).some(function (c) {
        if (picked.indexOf(c) === -1) picked.push(c);
        return picked.length >= WALL_SIZE;
      });
    }

    // Deeper depth favours weightier stories; headline length is the only proxy
    // available to the website, since the feed's own depth signal is in-app.
    picked.sort(function (a, b) {
      var la = (a.title || '').length, lb = (b.title || '').length;
      return depth >= 0.5 ? lb - la : la - lb;
    });

    var chosenCards = picked.slice(0, WALL_SIZE);
    if (chosenCards.length) paintWall(wall, chosenCards);
    else wall.innerHTML = '<p class="hp-list-empty">Live stories are refreshing — check back shortly.</p>';

    // The local prompt is a separate, quieter line under the list — not a
    // fake card pretending to be a story.
    var prompt = $('#hpLocalPrompt');
    if (prompt) {
      prompt.hidden = false;
      if (hasCity()) {
        prompt.innerHTML = '<strong>' + escapeHtml(store.place) + '</strong> is in your mix, ranked 3× higher. ' +
          '<button type="button" data-openapp="1">Open it in InSnaps</button>';
      } else {
        prompt.innerHTML = 'Showing world news only — your city and country are not set, ' +
          'so there is nothing to put in the local or national tier yet. ' +
          '<button type="button" data-setcity="1">Choose your city</button> to unlock the blend.';
      }
      var setBtn = prompt.querySelector('[data-setcity]');
      if (setBtn) setBtn.addEventListener('click', function () {
        track('local_prompt_set_city', {});
        if (window.InSnapsCity) window.InSnapsCity.openPicker();
      });
      var openBtn = prompt.querySelector('[data-openapp]');
      if (openBtn) openBtn.addEventListener('click', function () {
        track('local_prompt_open_app', { place: store.place });
        if (window.InSnapsViewBar) {
          window.InSnapsViewBar.openApp(window.InSnapsPulse.slugify(store.place));
        }
      });
    }

  }

  var TIER_LABEL = { local: 'Local', national: 'National', world: 'World', trending: 'Trending' };

  /* The wall uses the same card system as /live/ (livecards.js), so the two
     surfaces read as one product rather than two takes on the same data. */
  function paintWall(host, cards) {
    var LC = window.InSnapsLiveCards;
    if (!LC) { host.innerHTML = ''; return; }
    var norm = cards.map(function (c) {
      return LC.normalize(c, c.tier === 'trending' ? 'trending' : (c.tier || 'world'),
                          { place: c.place || null });
    }).filter(Boolean);
    LC.render(host, norm, {
      eager: 3,
      // Local and national stories carry no photography, so let them use the
      // app's breaking templates rather than rendering as a block of text.
      allowTemplateArt: true,
      onClick: function (a) { track('wall_card_click', { tier: a.getAttribute('data-tier') || 'unknown' }); }
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
