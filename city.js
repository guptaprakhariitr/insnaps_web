/* The visitor's chosen city — one source of truth for the whole site.
 *
 * Persisted in localStorage and surfaced as a navbar control on every page, so
 * the choice survives navigation and can be changed from anywhere.
 *
 * A city may only ever be set by picking a suggestion. Free text is refused on
 * purpose: two places share a name often enough (Springfield, six US states;
 * Bhilwara, a city and three villages) that a bare string cannot identify one,
 * and the country is needed to scope the news query.
 *
 * Geocoding: Photon (photon.komoot.io), which serves OpenStreetMap data and is
 * built for prefix search. The app resolves cities with Nominatim
 * (lib/services/city_search_service.dart) and that stays the fallback here, but
 * Nominatim is a geocoder, not an autocomplete — it returns nothing for
 * "bhilw" or "springfi", so it cannot drive a dropdown on its own.
 *
 *   window.InSnapsCity.get() -> {city,state,country,cc,label} | null
 *   window.InSnapsCity.set(city)
 *   window.InSnapsCity.onChange(fn)
 *   window.InSnapsCity.search(q) -> Promise<city[]>
 *   window.InSnapsCity.openPicker()
 */
(function () {
  'use strict';

  var KEY = 'insnaps-city';
  var PHOTON = 'https://photon.komoot.io/api/';
  var NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  var CITY_KEYS = ['city', 'town', 'village', 'municipality', 'hamlet', 'suburb', 'county'];
  // Real cities before villages, so "Bhilwara" the city outranks the three
  // villages that share its name.
  var RANK = { city: 0, town: 1, borough: 1, municipality: 2, village: 3, hamlet: 4, suburb: 5 };

  var listeners = [];
  var gateListeners = [];
  var gateIsOpen = false;
  var cache = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function track(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }

  // ── storage ──────────────────────────────────────────────────────

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      return (c && c.city && c.cc) ? c : null;
    } catch (_) { return null; }
  }

  function set(city) {
    if (!city || !city.city || !city.cc) return null;
    var clean = {
      city: city.city, state: city.state || '', country: city.country || '',
      cc: city.cc, lat: city.lat || 0, lon: city.lon || 0,
      label: city.label || [city.city, city.state, city.country].filter(Boolean).join(', ')
    };
    try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch (_) {}
    renderChip();
    listeners.forEach(function (fn) { try { fn(clean); } catch (_) {} });
    return clean;
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (_) {}
    renderChip();
    listeners.forEach(function (fn) { try { fn(null); } catch (_) {} });
  }

  // ── geocoding ────────────────────────────────────────────────────

  function pickCityName(addr) {
    for (var i = 0; i < CITY_KEYS.length; i++) {
      var v = addr[CITY_KEYS[i]];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  }

  function normalize(list) {
    var out = [], seen = {};
    list.forEach(function (it) {
      if (!it.city || !it.cc) return;
      // County is part of the key so a city and a same-named village in the
      // same state stay distinguishable.
      var key = (it.city + '|' + it.state + '|' + (it.county || '') + '|' + it.cc).toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      it.label = [it.city, it.state, it.country].filter(Boolean).join(', ');
      out.push(it);
    });
    out.sort(function (a, b) {
      var ra = RANK[a.kind] == null ? 6 : RANK[a.kind];
      var rb = RANK[b.kind] == null ? 6 : RANK[b.kind];
      return ra - rb;
    });
    return out;
  }

  function searchPhoton(q) {
    // lang=en, or Photon answers in the local language ("Norge", "España").
    var url = PHOTON + '?q=' + encodeURIComponent(q) + '&limit=10&layer=city&lang=en';
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (d) {
      return normalize(((d && d.features) || []).map(function (f) {
        var pr = f.properties || {};
        var co = (f.geometry && f.geometry.coordinates) || [0, 0];
        return {
          city: (pr.name || '').trim(),
          state: (pr.state || '').trim(),
          county: (pr.county || '').trim(),
          country: (pr.country || '').trim(),
          cc: (pr.countrycode || '').toUpperCase(),
          kind: pr.osm_value || pr.type || '',
          lon: co[0], lat: co[1]
        };
      }));
    });
  }

  function searchNominatim(q) {
    var url = NOMINATIM + '?q=' + encodeURIComponent(q) +
      '&format=json&addressdetails=1&limit=10&featuretype=settlement&accept-language=en';
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (raw) {
      if (!Array.isArray(raw)) return [];
      return normalize(raw.map(function (row) {
        var a = (row && row.address) || {};
        return {
          city: pickCityName(a),
          state: (a.state || a.region || a.province || '').trim(),
          county: (a.county || '').trim(),
          country: (a.country || '').trim(),
          cc: (a.country_code || '').toUpperCase(),
          kind: row.type || '',
          lat: parseFloat(row.lat) || 0, lon: parseFloat(row.lon) || 0
        };
      }));
    });
  }

  function search(q) {
    q = (q || '').trim();
    if (q.length < 2) return Promise.resolve([]);
    if (cache[q]) return Promise.resolve(cache[q]);
    return searchPhoton(q)
      .then(function (items) { return items.length ? items : searchNominatim(q); })
      .catch(function () { return searchNominatim(q).catch(function () { return []; }); })
      .then(function (items) { cache[q] = items; return items; });
  }

  /* Wire an <input> + <ul> pair into a city combobox. Returns a controller.
     onPick fires only for a chosen suggestion — never for typed text. */
  function attach(input, list, onPick, opts) {
    opts = opts || {};
    var st = { items: [], open: false, active: -1, seq: 0 };

    function close() {
      st.open = false; st.active = -1;
      list.hidden = true; list.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      if (opts.onOpenChange) opts.onOpenChange(false);
    }

    function place() {
      if (!opts.flip) return;
      var bar = document.querySelector('.viewbar');
      var barH = (bar && getComputedStyle(bar).display !== 'none') ? bar.getBoundingClientRect().height : 0;
      var below = window.innerHeight - barH - input.getBoundingClientRect().bottom;
      list.classList.toggle('is-up', below < Math.min(list.scrollHeight || 240, 300) + 14);
    }

    function render(items, note) {
      list.innerHTML = note
        ? '<li class="hp-ac-note" role="presentation">' + esc(note) + '</li>'
        : items.map(function (it, i) {
            return '<li class="hp-ac-item" role="option" id="isAc' + i + '" data-i="' + i + '" aria-selected="false">' +
              '<span class="hp-ac-city">' + esc(it.city) + '</span>' +
              '<span class="hp-ac-rest">' + esc([it.state, it.country].filter(Boolean).join(', ')) + '</span>' +
              '</li>';
          }).join('');
      st.items = items; st.open = true; st.active = -1;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      place();
      if (opts.onOpenChange) opts.onOpenChange(true);
    }

    function highlight(n) {
      var els = list.querySelectorAll('.hp-ac-item');
      if (!els.length) return;
      if (n < 0) n = els.length - 1;
      if (n >= els.length) n = 0;
      st.active = n;
      Array.prototype.forEach.call(els, function (el, i) {
        var on = i === n;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) {
          input.setAttribute('aria-activedescendant', el.id);
          if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    function choose(i) {
      var it = st.items[i];
      if (!it) return;
      input.value = it.label;
      close();
      var saved = set(it);
      track('city_selected', { city: it.city, cc: it.cc, kind: it.kind || 'unknown' });
      if (onPick) onPick(saved || it);
    }

    var run = function () {
      var q = input.value.trim();
      if (q.length < 2) { close(); return; }
      var seq = ++st.seq;
      render([], 'Searching…');
      search(q).then(function (items) {
        if (seq !== st.seq) return;
        if (!items.length) { render([], 'No city found for “' + q + '”'); return; }
        render(items);
      });
    };
    var t = null;
    // Debounced: OSM's usage policy asks for low volume, so never per keystroke.
    function debounced() { clearTimeout(t); t = setTimeout(run, 420); }

    input.addEventListener('input', debounced);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        // Enter must not "submit" a typed string — a city has to be picked.
        e.preventDefault();
        if (st.open && st.active >= 0) return choose(st.active);
        if (st.open && st.items.length === 1) return choose(0);
        if (!st.open) run();
        return;
      }
      if (!st.open) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(st.active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(st.active - 1); }
      else if (e.key === 'Escape') { close(); }
    });
    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('.hp-ac-item');
      if (!li) return;
      e.preventDefault();
      choose(parseInt(li.getAttribute('data-i'), 10));
    });

    return { run: run, close: close, isOpen: function () { return st.open; },
             count: function () { return st.items.length; } };
  }

  // ── navbar chip ──────────────────────────────────────────────────

  function chipHost() {
    return document.querySelector('.nav-right') ||
           document.querySelector('.bar-right') ||
           document.querySelector('.nav-container');
  }

  function renderChip() {
    var host = chipHost();
    if (!host) return;
    var chip = document.getElementById('isCityChip');
    var c = get();
    if (!chip) {
      chip = document.createElement('button');
      chip.id = 'isCityChip';
      chip.type = 'button';
      chip.className = 'city-chip';
      chip.addEventListener('click', function (e) { e.preventDefault(); openPicker(); });
      host.insertBefore(chip, host.firstChild);
    }
    chip.setAttribute('aria-label', c ? ('Your city: ' + c.label + '. Change it.') : 'Choose your city');
    chip.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
        '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
      '<span class="city-chip-text">' + esc(c ? c.city : 'Set your city') + '</span>' +
      (c ? '<span class="city-chip-cc">' + esc(c.cc) + '</span>' : '');
    chip.classList.toggle('is-empty', !c);
  }

  // ── picker dialog ────────────────────────────────────────────────

  var dlg = null;

  function openPicker() {
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.className = 'city-dlg';
      dlg.innerHTML =
        '<div class="city-dlg-backdrop" data-close="1"></div>' +
        '<div class="city-dlg-panel" role="dialog" aria-modal="true" aria-label="Choose your city">' +
          '<div class="city-dlg-head">' +
            '<h2>Your city</h2>' +
            '<button class="city-dlg-x" type="button" data-close="1" aria-label="Close">&times;</button>' +
          '</div>' +
          '<p class="city-dlg-sub">Pick from the list — we need the country too, because the same city name exists in more than one.</p>' +
          '<div class="city-dlg-field">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
            '<input id="isCityInput" type="text" autocomplete="off" spellcheck="false" placeholder="Start typing a city…" ' +
              'role="combobox" aria-expanded="false" aria-controls="isCityList" aria-autocomplete="list" aria-label="Search for your city">' +
          '</div>' +
          '<ul class="hp-ac city-dlg-list" id="isCityList" role="listbox" aria-label="City suggestions" hidden></ul>' +
          '<button class="city-dlg-clear" type="button" data-clear="1">Clear my city</button>' +
        '</div>';
      document.body.appendChild(dlg);
      dlg.addEventListener('mousedown', function (e) {
        if (e.target.closest('[data-close]')) closePicker();
      });
      dlg.addEventListener('click', function (e) {
        if (e.target.closest('[data-clear]')) { clear(); closePicker(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && dlg && dlg.classList.contains('is-open')) closePicker();
      });
      attach(dlg.querySelector('#isCityInput'), dlg.querySelector('#isCityList'),
             function () { closePicker(); });
    }
    var input = dlg.querySelector('#isCityInput');
    var c = get();
    input.value = '';
    input.placeholder = c ? c.label : 'Start typing a city…';
    dlg.querySelector('.city-dlg-clear').hidden = !c;
    dlg.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 40);
    track('city_picker_open', { has_city: !!c });
  }

  function closePicker() {
    if (!dlg) return;
    dlg.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // ── first-run gate ───────────────────────────────────────────────

  /* First visit with no city: hold the page behind a plain themed cover, fade
     the picker in, and fade the site in once a city is chosen.
     Homepage only — a visitor arriving on an /answers/ page from an AI citation
     should read the answer, not meet a modal. Skippable, so it is never a trap
     (and the choice is remembered either way). */
  function gateEligible() {
    if (get()) return false;
    // Homepage only. The deep-link handlers (/a/, /t/) and the answer pages must
    // never be gated: a shared article link has to land in the app, and a
    // visitor arriving from an AI citation has to reach the answer.
    var p = location.pathname.replace(/\/index\.html$/, '');
    return p === '' || p === '/';
  }

  function openGate() {
    var cover = document.createElement('div');
    cover.className = 'city-gate';
    cover.innerHTML =
      '<div class="city-gate-panel" role="dialog" aria-modal="true" aria-labelledby="isGateTitle">' +
          '<h2 id="isGateTitle">Where are you reading from?</h2>' +
        '<p>InSnaps blends your city, your country and the world. Pick your city and the rest of the page tunes to it.</p>' +
        '<div class="city-dlg-field">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<input id="isGateInput" type="text" autocomplete="off" spellcheck="false" placeholder="Start typing a city…" ' +
            'role="combobox" aria-expanded="false" aria-controls="isGateList" aria-autocomplete="list" aria-label="Search for your city">' +
        '</div>' +
        '<ul class="hp-ac city-gate-list" id="isGateList" role="listbox" aria-label="City suggestions" hidden></ul>' +
      '</div>';
    document.body.appendChild(cover);
    document.documentElement.classList.add('city-gated');
    gateIsOpen = true;

    function dismiss() {
      gateIsOpen = false;
      gateListeners.forEach(function (fn) { try { fn(); } catch (_) {} });
      cover.classList.remove('is-shown');
      document.documentElement.classList.remove('city-gated');
      document.documentElement.classList.add('city-gate-done');
      setTimeout(function () {
        if (cover.parentNode) cover.parentNode.removeChild(cover);
        document.documentElement.classList.remove('city-gate-done');
      }, 520);
    }

    attach(cover.querySelector('#isGateInput'), cover.querySelector('#isGateList'),
           function () { track('city_gate_completed', {}); dismiss(); });

    // Fade in on the next frame so the transition actually runs.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        cover.classList.add('is-shown');
        cover.querySelector('#isGateInput').focus();
      });
    });
    track('city_gate_shown', {});
  }

  // ── boot ─────────────────────────────────────────────────────────

  function boot() {
    renderChip();
    if (gateEligible()) openGate();
  }

  // Set synchronously at parse time so a consumer that initialises before
  // DOMContentLoaded still sees the gate coming.
  gateIsOpen = gateEligible();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.InSnapsCity = {
    /* The gate hides the page with opacity, which does not stop anything
       running behind it — the Pulse reel kept autoplaying (and, once narration
       defaulted to on, started talking the moment a key was pressed in the gate
       input). Consumers use these to hold off until the gate is answered. */
    gateOpen: function () { return gateIsOpen; },
    onGateClose: function (fn) { if (typeof fn === 'function') gateListeners.push(fn); },
    get: get,
    set: set,
    clear: clear,
    search: search,
    attach: attach,
    openPicker: openPicker,
    closePicker: closePicker,
    renderChip: renderChip,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
