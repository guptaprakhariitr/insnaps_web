(function () {
  'use strict';

  var PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree&hl=en_IN';
  var IOS_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfc8kj-R9Mpd9ShTGOr4tqGcAsQ0GZsP2j13bDPMKkqzzDeEQ/viewform?embedded=true';

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

  toggle.addEventListener('click', function () {
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('insnaps-theme', next);
  });

  // --- Navbar scroll state ---
  var navbar = document.getElementById('navbar');
  function updateNav() {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // --- Mobile hamburger ---
  var hamburger = document.getElementById('navHamburger');
  var navLinks = document.getElementById('navLinks');
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

  // --- iOS Form Toggle inside modal ---
  var iosModalToggle = document.getElementById('iosModalFormToggle');
  var iosModalEmbed = document.getElementById('iosModalFormEmbed');
  if (iosModalToggle && iosModalEmbed) {
    iosModalToggle.addEventListener('click', function () {
      var open = iosModalEmbed.style.display !== 'none';
      iosModalEmbed.style.display = open ? 'none' : 'block';
      iosModalToggle.textContent = open ? 'Join iOS Waitlist' : 'Hide Form';
    });
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

    fetch('https://www.reddit.com/r/InSnapsNewsUpdates.json?limit=6&raw_json=1', { headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var posts = data.data.children;
        if (!posts.length) { showFallback(); return; }
        if (header) header.textContent = 'Live from r/InSnapsNewsUpdates';
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
      container.innerHTML = '<a href="https://www.reddit.com/r/InSnapsNewsUpdates/" target="_blank" rel="noopener" class="reddit-preview-item"><div class="reddit-vote"><span class="reddit-arrow">\u25B2</span></div><div class="reddit-item-body"><p class="reddit-item-title">Visit r/InSnapsNewsUpdates for live geopolitics discussions and community analysis.</p><span class="reddit-item-meta">Community \u00b7 Join the conversation</span></div></a>';
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
  // 3D GLOBE (Globe.gl)
  // ========================================
  (function initGlobe() {
    var globeContainer = document.getElementById('globeViz');
    if (!globeContainer || typeof Globe === 'undefined') return;

    var CONFLICTS = [];
    try { CONFLICTS = JSON.parse(document.getElementById('conflictsGeoData').textContent); } catch(e) {}

    var isDark = html.getAttribute('data-theme') !== 'light';
    var globe = Globe()
      .globeImageUrl(isDark
        ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
        : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .backgroundImageUrl(isDark
        ? 'https://unpkg.com/three-globe/example/img/night-sky.png'
        : '')
      .backgroundColor(isDark ? '#050505' : '#f5f5f7')
      .pointsData(CONFLICTS)
      .pointLat('lat')
      .pointLng('lng')
      .pointAltitude(function(d) { return d.severity === 'critical' ? 0.12 : d.severity === 'significant' ? 0.08 : 0.05; })
      .pointRadius(function(d) { return d.severity === 'critical' ? 0.55 : d.severity === 'significant' ? 0.4 : 0.3; })
      .pointColor(function(d) { return d.severity === 'critical' ? '#ef4444' : d.severity === 'significant' ? '#f59e0b' : '#3b82f6'; })
      .pointLabel(function(d) { return '<div style="text-align:center;font-family:Inter,sans-serif;padding:6px 10px;background:rgba(0,0,0,0.85);color:#fff;border-radius:8px;font-size:13px;max-width:200px"><strong>' + d.title + '</strong><br><span style="font-size:11px;opacity:0.8">' + d.status + '</span></div>'; })
      .onPointClick(function(d) {
        window.location.href = '/conflicts/' + d.slug + '/';
      })
      .atmosphereColor(isDark ? 'rgba(20,184,166,0.15)' : 'rgba(13,148,136,0.1)')
      .atmosphereAltitude(0.2)
      .width(globeContainer.clientWidth)
      .height(globeContainer.clientHeight)
      (globeContainer);

    // Auto-rotate
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.5;
    globe.controls().enableZoom = true;
    globe.controls().minDistance = 200;
    globe.controls().maxDistance = 500;

    // Pulse rings for critical conflicts
    var criticalConflicts = CONFLICTS.filter(function(d) { return d.severity === 'critical'; });
    globe.ringsData(criticalConflicts)
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(function() { return 'rgba(239,68,68,0.6)'; })
      .ringMaxRadius(3)
      .ringPropagationSpeed(1.5)
      .ringRepeatPeriod(2000);

    // Responsive
    window.addEventListener('resize', function () {
      globe.width(globeContainer.clientWidth).height(globeContainer.clientHeight);
    });

    // Theme sync
    toggle.addEventListener('click', function () {
      setTimeout(function() {
        var dark = html.getAttribute('data-theme') !== 'light';
        globe.globeImageUrl(dark
          ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
          : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .backgroundImageUrl(dark ? 'https://unpkg.com/three-globe/example/img/night-sky.png' : '')
          .backgroundColor(dark ? '#050505' : '#f5f5f7')
          .atmosphereColor(dark ? 'rgba(20,184,166,0.15)' : 'rgba(13,148,136,0.1)');
      }, 100);
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
  // ENGAGEMENT: EXIT INTENT POPUP (desktop only)
  // ========================================
  var exitPopup = document.getElementById('exitPopup');
  var exitClose = document.getElementById('exitPopupClose');
  if (exitPopup && !isMobile) {
    var exitShown = false;
    document.addEventListener('mouseout', function (e) {
      if (e.clientY < 5 && !exitShown && !sessionStorage.getItem('insnaps-exit')) {
        exitShown = true;
        exitPopup.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });
  }
  if (exitClose && exitPopup) {
    exitClose.addEventListener('click', function () {
      exitPopup.classList.remove('open');
      document.body.style.overflow = '';
      sessionStorage.setItem('insnaps-exit', '1');
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
