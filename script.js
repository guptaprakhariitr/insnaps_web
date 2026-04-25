(function () {
  'use strict';

  var PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree&hl=en_IN';
  var APP_STORE = 'https://apps.apple.com/us/app/insnaps-world-news-cards-app/id6762338049';

  // ========================================
  // RSS FEED CONFIGURATION — Google News
  // ========================================
  var RSS_BASE = 'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=';
  var RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';

  var RSS_FEEDS = [
    { label: 'Ukraine-Russia',    q: '"ukraine+russia+war"' },
    { label: 'Israel-Palestine',  q: '"israel+palestine+conflict"' },
    { label: 'Sudan Civil War',   q: '"sudan+civil+war"' },
    { label: 'Myanmar',           q: '"myanmar+civil+war"' },
    { label: 'Yemen',             q: '"yemen+war+houthi"' },
    { label: 'Ethiopia',          q: '"ethiopia+conflict"' },
    { label: 'DR Congo',          q: '"congo+war+M23"' },
    { label: 'Syria',             q: '"syria+conflict"' },
    { label: 'Taiwan Strait',     q: '"taiwan+china+tensions"' },
    { label: 'South China Sea',   q: '"south+china+sea+dispute"' },
    { label: 'North Korea',       q: '"north+korea+nuclear+threat"' },
    { label: 'Somalia',           q: '"somalia+conflict+al+shabaab"' },
    { label: 'Libya',             q: '"libya+conflict"' },
    { label: 'Armenia-Azerbaijan',q: '"armenia+azerbaijan+conflict"' },
    { label: 'Haiti',             q: '"haiti+crisis+gang+violence"' },
    { label: 'Afghanistan',       q: '"afghanistan+taliban"' },
    { label: 'Lebanon',           q: '"lebanon+hezbollah+conflict"' },
    { label: 'Iran Tensions',     q: '"iran+nuclear+tensions"' },
    { label: 'Sahel Crisis',      q: '"sahel+crisis+conflict"' },
    { label: 'Mozambique',        q: '"mozambique+insurgency"' },
    { label: 'Colombia',          q: '"colombia+conflict"' },
    { label: 'Kashmir',           q: '"kashmir+conflict+tensions"' },
    { label: 'Venezuela',         q: '"venezuela+conflict"' },
    { label: 'Sanctions',         q: '"global+sanctions+geopolitics"' },
    { label: 'Military',          q: '"military+operations+defense"' },
    { label: 'Diplomacy',         q: '"diplomacy+peace+talks"' },
    { label: 'Geopolitics',       q: '"geopolitics+world+order"' },
    { label: 'Iraq',              q: '"iraq+security+conflict"' },
    { label: 'South Sudan',       q: '"south+sudan+conflict"' },
    { label: 'Mexico',            q: '"mexico+cartel+violence"' }
  ];

  function buildRssUrl(feed) {
    return RSS_BASE + encodeURIComponent(feed.q).replace(/%2B/g, '+').replace(/%22/g, '"');
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fetchRss(feed) {
    var url = RSS_PROXY + encodeURIComponent(buildRssUrl(feed));
    return fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      if (data.status !== 'ok' || !data.items) return [];
      return data.items.map(function(item) {
        return {
          title: escapeHtml(item.title || ''),
          link: item.link,
          pubDate: item.pubDate,
          source: escapeHtml(item.author || (item.title.split(' - ').pop() || '').trim()),
          feedLabel: feed.label
        };
      });
    }).catch(function() { return []; });
  }

  function fetchMultipleFeeds(feeds) {
    return Promise.all(feeds.map(fetchRss)).then(function(results) {
      var all = [];
      results.forEach(function(items) { all = all.concat(items); });
      all.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });
      return all;
    });
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  window.InSnapsRSS = {
    FEEDS: RSS_FEEDS,
    buildUrl: buildRssUrl,
    fetchFeed: fetchRss,
    fetchMultiple: fetchMultipleFeeds,
    shuffle: shuffleArray
  };

  // --- Platform Detection ---
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var isMobile = isIOS || isAndroid;

  // --- Theme Toggle ---
  var html = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var stored = localStorage.getItem('insnaps-theme');
  if (stored) html.setAttribute('data-theme', stored);
  else if (window.matchMedia('(prefers-color-scheme: light)').matches) html.setAttribute('data-theme', 'light');

  if (toggle) toggle.addEventListener('click', function () {
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('insnaps-theme', next);
  });

  // --- Navbar scroll state ---
  var navbar = document.getElementById('navbar');
  if (navbar) {
    function updateNav() {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // --- Mobile hamburger ---
  var hamburger = document.getElementById('navHamburger');
  var navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
      document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ========================================
  // PLATFORM-AWARE DOWNLOAD MODAL
  // ========================================
  var modal = document.getElementById('downloadModal');
  var modalClose = document.getElementById('modalClose');
  var modalOverlay = document.getElementById('modalOverlay');

  function showDownloadModal() {
    if (!modal) return;
    if (isAndroid) {
      window.open(PLAY_STORE, '_blank');
      return;
    }
    if (isIOS) {
      window.open(APP_STORE, '_blank');
      return;
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', hideModal);
  if (modalOverlay) modalOverlay.addEventListener('click', hideModal);

  // Intercept all download buttons with class "dl-btn"
  document.querySelectorAll('.dl-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showDownloadModal();
    });
  });

  // Nav CTA button
  var navCta = document.querySelector('.nav-cta');
  if (navCta) {
    navCta.addEventListener('click', function (e) {
      e.preventDefault();
      showDownloadModal();
    });
  }

  // --- iOS Form Toggle inside modal (legacy, kept for backwards compat) ---
  var iosModalToggle = document.getElementById('iosModalFormToggle');
  var iosModalEmbed = document.getElementById('iosModalFormEmbed');
  if (iosModalToggle && iosModalEmbed) {
    var iosOrigHTML = iosModalToggle.innerHTML;
    iosModalToggle.addEventListener('click', function () {
      var open = iosModalEmbed.style.display !== 'none';
      iosModalEmbed.style.display = open ? 'none' : 'block';
      if (open) {
        iosModalToggle.innerHTML = iosOrigHTML;
      } else {
        iosModalToggle.textContent = 'Hide Form';
      }
    });
  }

  // ========================================
  // LIVE RSS TICKER FETCH
  // ========================================
  var tickerTrack = document.getElementById('tickerTrack');
  var lastUpdateEl = document.getElementById('lastUpdateTime');

  (function loadLiveTicker() {
    if (!tickerTrack) return;
    var picks = shuffleArray(RSS_FEEDS.slice()).slice(0, 6);
    fetchMultipleFeeds(picks).then(function(articles) {
      if (!articles.length) return;
      var headlines = articles.slice(0, 16);
      var html = '';
      headlines.forEach(function(a) {
        var short = a.title.length > 120 ? a.title.substring(0, 117) + '...' : a.title;
        html += '<span>' + a.feedLabel + ': ' + short + '</span>';
      });
      tickerTrack.innerHTML = html + html;
      if (lastUpdateEl) {
        lastUpdateEl.textContent = 'just now';
      }
    }).catch(function() {
      if (lastUpdateEl) {
        var mins = Math.floor(Math.random() * 8) + 2;
        lastUpdateEl.textContent = mins + ' minutes ago';
      }
    });
  })();

  if (lastUpdateEl && !tickerTrack) {
    var mins = Math.floor(Math.random() * 8) + 2;
    lastUpdateEl.textContent = mins + ' minutes ago';
  }

  // ========================================
  // STICKY BANNER — auto-dismiss after 8s
  // ========================================
  var appBanner = document.getElementById('appBanner');
  var bannerClose = document.getElementById('appBannerClose');
  if (appBanner && bannerClose) {
    var bannerDismissed = sessionStorage.getItem('insnaps-banner-dismissed');
    var bannerTimer;
    if (!bannerDismissed) {
      setTimeout(function () {
        appBanner.classList.add('visible');
        bannerTimer = setTimeout(function () {
          appBanner.classList.remove('visible');
        }, 8000);
      }, 3000);
    }
    bannerClose.addEventListener('click', function () {
      clearTimeout(bannerTimer);
      appBanner.classList.remove('visible');
      appBanner.classList.add('hidden');
      sessionStorage.setItem('insnaps-banner-dismissed', '1');
    });
  }

  // ========================================
  // SCROLL REVEAL
  // ========================================
  var reveals = document.querySelectorAll('.reveal');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  reveals.forEach(function (el) { revealObserver.observe(el); });

  // ========================================
  // COUNTER ANIMATION
  // ========================================
  var counters = document.querySelectorAll('.stat-number');
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(function (el) { counterObserver.observe(el); });

  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    var duration = 1500;
    var start = performance.now();
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * ease);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ========================================
  // STICKY FEATURE SHOWCASE
  // ========================================
  var showcaseTrack = document.querySelector('.showcase-track');
  if (showcaseTrack) {
    var slides = document.querySelectorAll('.showcase-slide');
    var phoneImgs = document.querySelectorAll('.showcase-phone img');
    var dots = document.querySelectorAll('.showcase-dots .dot');
    var totalSlides = slides.length;
    function updateShowcase() {
      var rect = showcaseTrack.getBoundingClientRect();
      var trackHeight = rect.height - window.innerHeight;
      var scrolled = -rect.top;
      var progress = Math.max(0, Math.min(1, scrolled / trackHeight));
      var index = Math.min(Math.floor(progress * totalSlides), totalSlides - 1);
      slides.forEach(function (s, i) { s.classList.toggle('active', i === index); });
      phoneImgs.forEach(function (img, i) { img.classList.toggle('active', i === index); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === index); });
    }
    window.addEventListener('scroll', updateShowcase, { passive: true });
    updateShowcase();
  }

  // ========================================
  // DOWNLOAD COUNTER — rolls to 1000
  // ========================================
  var dlCounter = document.getElementById('downloadCounter');
  if (dlCounter) {
    var milestones = [1,5,10,25,50,100,150,200,300,400,500,600,700,800,900,950,1000];
    var dlStarted = false;
    var dlObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !dlStarted) {
        dlStarted = true;
        runDownloadCounter();
        dlObserver.disconnect();
      }
    }, { threshold: 0.3 });
    dlObserver.observe(dlCounter);

    function runDownloadCounter() {
      var i = 0;
      function tick() {
        if (i >= milestones.length) return;
        dlCounter.textContent = milestones[i].toLocaleString();
        dlCounter.classList.add('tick');
        setTimeout(function () { dlCounter.classList.remove('tick'); }, 100);
        var speed = i < 5 ? 200 : i < 10 ? 120 : 60;
        i++;
        setTimeout(tick, speed);
      }
      tick();
    }
  }

  // ========================================
  // HERO PHONE PARALLAX
  // ========================================
  var heroPhone = document.querySelector('.hero-phone');
  var heroSection = document.querySelector('.hero');
  if (heroPhone && heroSection) {
    function updateParallax() {
      var y = window.scrollY;
      if (y < heroSection.offsetHeight) {
        heroPhone.style.transform = 'perspective(1000px) rotateY(-5deg) rotateX(2deg) translateY(' + (y * 0.12) + 'px)';
      }
    }
    window.addEventListener('scroll', updateParallax, { passive: true });
  }

  // ========================================
  // GALLERY DRAG SCROLL
  // ========================================
  var galleryScroll = document.querySelector('.gallery-scroll');
  if (galleryScroll) {
    var isDown = false, startX, scrollLeft;
    galleryScroll.addEventListener('mousedown', function (e) {
      isDown = true; galleryScroll.style.cursor = 'grabbing';
      startX = e.pageX - galleryScroll.offsetLeft; scrollLeft = galleryScroll.scrollLeft;
    });
    galleryScroll.addEventListener('mouseleave', function () { isDown = false; galleryScroll.style.cursor = ''; });
    galleryScroll.addEventListener('mouseup', function () { isDown = false; galleryScroll.style.cursor = ''; });
    galleryScroll.addEventListener('mousemove', function (e) {
      if (!isDown) return; e.preventDefault();
      galleryScroll.scrollLeft = scrollLeft - ((e.pageX - galleryScroll.offsetLeft) - startX) * 1.5;
    });
  }

  // ========================================
  // LIVE REDDIT FEED
  // ========================================
  (function loadRedditFeed() {
    var container = document.getElementById('redditPosts');
    var header = document.querySelector('#redditFeed .reddit-preview-header span:last-child');
    if (!container) return;

    fetch('https://www.reddit.com/r/WorldNewsSnaps.json?limit=6&raw_json=1', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var posts = data.data.children;
        if (!posts.length) { showFallback(); return; }
        if (header) header.textContent = 'Live from r/WorldNewsSnaps';
        container.innerHTML = '';
        posts.forEach(function (child) {
          var p = child.data;
          var item = document.createElement('a');
          item.href = 'https://www.reddit.com' + p.permalink;
          item.target = '_blank'; item.rel = 'noopener';
          item.className = 'reddit-preview-item reddit-preview-item--live';
          var thumb = p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : '';
          item.innerHTML =
            '<div class="reddit-vote"><span class="reddit-arrow">\u25B2</span><span class="reddit-score">' + (p.score||0) + '</span></div>' +
            (thumb ? '<img class="reddit-thumb" src="' + thumb + '" alt="" />' : '') +
            '<div class="reddit-item-body"><p class="reddit-item-title">' + escapeHtml(p.title) + '</p>' +
            '<span class="reddit-item-meta">' + (p.link_flair_text ? '<span class="reddit-flair">' + escapeHtml(p.link_flair_text) + '</span> \u00b7 ' : '') +
            timeAgo(p.created_utc) + ' \u00b7 ' + (p.num_comments||0) + ' comments</span></div>';
          container.appendChild(item);
        });
      }).catch(showFallback);

    function showFallback() {
      if (header) header.textContent = 'Live discussions & geopolitics updates';
      container.innerHTML = '<a href="https://www.reddit.com/r/WorldNewsSnaps/" target="_blank" rel="noopener" class="reddit-preview-item"><div class="reddit-vote"><span class="reddit-arrow">\u25B2</span></div><div class="reddit-item-body"><p class="reddit-item-title">Visit r/WorldNewsSnaps for live geopolitics discussions and community analysis.</p><span class="reddit-item-meta">Community \u00b7 Join the conversation</span></div></a>';
    }
    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function timeAgo(epoch) {
      var diff = Math.floor(Date.now() / 1000) - epoch;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
      return Math.floor(diff / 604800) + 'w ago';
    }
  })();

  // ========================================
  // FLOATING DOWNLOAD BUTTON
  // ========================================
  var fab = document.getElementById('fabDownload');
  var ctaSection = document.querySelector('.cta-final');
  if (fab) {
    fab.addEventListener('click', function (e) {
      e.preventDefault();
      showDownloadModal();
    });
    function updateFab() {
      var pastHero = window.scrollY > window.innerHeight * 0.6;
      var atCta = ctaSection && ctaSection.getBoundingClientRect().top < window.innerHeight;
      fab.classList.toggle('visible', pastHero && !atCta);
    }
    window.addEventListener('scroll', updateFab, { passive: true });
    updateFab();
  }

  // ========================================
  // D3 ORTHOGRAPHIC GLOBE — SVG world map with conflict markers
  // ========================================
  (function initGlobe() {
    var container = document.getElementById('globeViz');
    if (!container || typeof d3 === 'undefined') return;

    var CONFLICTS = [];
    try { CONFLICTS = JSON.parse(document.getElementById('conflictsGeoData').textContent); } catch(e) {}

    var width = container.clientWidth || 600;
    var height = container.clientHeight || 520;
    var radius = Math.min(width, height) / 2.15;

    var projection = d3.geoOrthographic()
      .scale(radius)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate([-30, -15]);

    var path = d3.geoPath().projection(projection);

    var svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .style('cursor', 'grab');

    // Atmosphere glow
    var defs = svg.append('defs');
    var grad = defs.append('radialGradient').attr('id', 'globe-atmo');
    grad.append('stop').attr('offset', '85%').attr('stop-color', 'rgba(40,100,220,0.08)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(40,100,220,0)');
    svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2).attr('r', radius + 30)
      .attr('fill', 'url(#globe-atmo)');

    // Ocean sphere
    var sphere = svg.append('circle')
      .attr('cx', width / 2).attr('cy', height / 2).attr('r', radius)
      .attr('fill', '#0a1025');

    // Graticule
    var graticule = d3.geoGraticule().step([20, 20]);
    var graticulePath = svg.append('path')
      .datum(graticule())
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(50,100,180,0.08)')
      .attr('stroke-width', 0.4);

    var countriesGroup = svg.append('g');
    var dotsGroup = svg.append('g');

    function dotColor(d) {
      return d.severity === 'critical' ? '#f97316' : d.severity === 'significant' ? '#eab308' : '#22c55e';
    }
    function dotRadius(d) {
      return d.severity === 'critical' ? 6 : d.severity === 'significant' ? 4.5 : 3.5;
    }
    function isVisible(coords) {
      var r = projection.rotate();
      return d3.geoDistance(coords, [-r[0], -r[1]]) < Math.PI / 2;
    }

    function renderDots() {
      dotsGroup.selectAll('*').remove();
      CONFLICTS.forEach(function(d) {
        var coords = [d.lng, d.lat];
        if (!isVisible(coords)) return;
        var pos = projection(coords);
        if (!pos) return;

        if (d.severity === 'critical') {
          dotsGroup.append('circle')
            .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', dotRadius(d) + 4)
            .attr('fill', 'none').attr('stroke', dotColor(d)).attr('stroke-width', 1.2)
            .attr('opacity', 0.4);
        }
        dotsGroup.append('circle')
          .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', dotRadius(d))
          .attr('fill', dotColor(d)).attr('opacity', 0.92)
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(0 0 3px ' + dotColor(d) + ')')
          .on('click', function() { showGlobePopup(d); })
          .append('title').text(d.title + ' \u2014 ' + d.status);
      });
    }

    // Globe popup on click
    var popup = document.getElementById('globePopup');
    var popupClose = document.getElementById('globePopupClose');
    function showGlobePopup(d) {
      if (!popup) return;
      var col = dotColor(d);
      document.getElementById('globePopupTitle').textContent = d.title;
      document.getElementById('globePopupStatus').textContent = d.status;
      var sev = document.getElementById('globePopupSeverity');
      sev.textContent = d.severity;
      sev.style.background = col + '22';
      sev.style.color = col;
      document.getElementById('globePopupLink').href = '/conflicts/' + d.slug + '/';
      popup.style.display = 'block';
    }
    if (popupClose) {
      popupClose.addEventListener('click', function() { popup.style.display = 'none'; });
    }
    container.addEventListener('click', function(e) {
      if (popup && e.target === container.querySelector('svg')) popup.style.display = 'none';
    });

    function renderAll() {
      graticulePath.attr('d', path);
      countriesGroup.selectAll('path').attr('d', path);
      renderDots();
    }

    // Load countries
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(function(world) {
        var countries = topojson.feature(world, world.objects.countries);
        countriesGroup.selectAll('path')
          .data(countries.features)
          .join('path')
          .attr('d', path)
          .attr('fill', 'rgba(18,30,55,0.95)')
          .attr('stroke', 'rgba(80,140,240,0.3)')
          .attr('stroke-width', 0.5);
        renderDots();
      })
      .catch(function(err) { console.warn('Globe: failed to load countries', err); });

    // Drag to rotate
    var autoRotating = true;
    svg.call(d3.drag()
      .on('start', function() {
        autoRotating = false;
        svg.style('cursor', 'grabbing');
      })
      .on('drag', function(event) {
        var r = projection.rotate();
        projection.rotate([r[0] + event.dx * 0.4, Math.max(-60, Math.min(60, r[1] - event.dy * 0.4))]);
        renderAll();
      })
      .on('end', function() {
        svg.style('cursor', 'grab');
        setTimeout(function() { autoRotating = true; }, 3000);
      })
    );

    // Auto-rotation
    var last = Date.now();
    (function tick() {
      if (autoRotating) {
        var now = Date.now();
        var r = projection.rotate();
        projection.rotate([r[0] + (now - last) * 0.008, r[1]]);
        renderAll();
        last = now;
      } else { last = Date.now(); }
      requestAnimationFrame(tick);
    })();

    window.addEventListener('resize', function() {
      width = container.clientWidth || 600;
      height = container.clientHeight || 520;
      radius = Math.min(width, height) / 2.15;
      projection.scale(radius).translate([width / 2, height / 2]);
      svg.attr('width', width).attr('height', height);
      sphere.attr('cx', width / 2).attr('cy', height / 2).attr('r', radius);
      renderAll();
    });
  })();

  // ========================================
  // ENGAGEMENT: MID-SCROLL CTA
  // ========================================
  var midCta = document.getElementById('midScrollCta');
  var midCtaClose = document.getElementById('midCtaClose');
  if (midCta) {
    var midShown = false;
    var midObserver = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !midShown && !sessionStorage.getItem('insnaps-mid-cta')) {
        midShown = true;
        midCta.classList.add('visible');
        midObserver.disconnect();
      }
    }, { threshold: 0.3 });
    var statsSection = document.getElementById('stats');
    if (statsSection) midObserver.observe(statsSection);
  }
  if (midCtaClose && midCta) {
    midCtaClose.addEventListener('click', function () {
      midCta.classList.remove('visible');
      sessionStorage.setItem('insnaps-mid-cta', '1');
    });
  }

  // ========================================
  // ENGAGEMENT: EXIT INTENT POPUP (desktop only, after 30s)
  // ========================================
  var exitPopup = document.getElementById('exitPopup');
  var exitClose = document.getElementById('exitPopupClose');
  var exitOverlay = document.getElementById('exitOverlay');

  function closeExitPopup() {
    if (!exitPopup) return;
    exitPopup.classList.remove('open');
    document.body.style.overflow = '';
    sessionStorage.setItem('insnaps-exit', '1');
  }

  if (exitPopup && !isMobile) {
    var exitShown = false;
    var pageReady = false;
    // Only arm the exit intent after 30s on page to avoid "random" popups
    setTimeout(function () { pageReady = true; }, 30000);

    document.addEventListener('mouseout', function (e) {
      if (e.clientY < 5 && !exitShown && pageReady && !sessionStorage.getItem('insnaps-exit')) {
        exitShown = true;
        exitPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  }
  if (exitClose) exitClose.addEventListener('click', closeExitPopup);
  if (exitOverlay) exitOverlay.addEventListener('click', closeExitPopup);

  // Exit popup iOS link opens the download modal
  var exitIosLink = document.getElementById('exitIosLink');
  if (exitIosLink) {
    exitIosLink.addEventListener('click', function (e) {
      e.preventDefault();
      closeExitPopup();
      showDownloadModal();
    });
  }

  // ========================================
  // SMOOTH SCROLL
  // ========================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var offset = navbar.offsetHeight + 20;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
      }
    });
  });

})();
