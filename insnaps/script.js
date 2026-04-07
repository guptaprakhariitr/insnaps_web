(function () {
  'use strict';

  // --- Theme Toggle ---
  const html = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('insnaps-theme');

  if (stored) {
    html.setAttribute('data-theme', stored);
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    html.setAttribute('data-theme', 'light');
  }

  toggle.addEventListener('click', function () {
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('insnaps-theme', next);
  });

  // --- Navbar scroll state ---
  var navbar = document.getElementById('navbar');
  var lastScroll = 0;

  function updateNav() {
    var y = window.scrollY;
    navbar.classList.toggle('scrolled', y > 60);
    lastScroll = y;
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

  // --- Scroll Reveal ---
  var reveals = document.querySelectorAll('.reveal');
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  reveals.forEach(function (el) { revealObserver.observe(el); });

  // --- Counter Animation ---
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

  // --- Sticky Feature Showcase ---
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

      slides.forEach(function (s, i) {
        s.classList.toggle('active', i === index);
      });
      phoneImgs.forEach(function (img, i) {
        img.classList.toggle('active', i === index);
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === index);
      });
    }

    window.addEventListener('scroll', updateShowcase, { passive: true });
    updateShowcase();
  }

  // --- Animated Download Counter (dramatic rolling) ---
  var dlCounter = document.getElementById('downloadCounter');
  if (dlCounter) {
    var milestones = [1,2,5,8,10,15,25,40,50,75,100,130,170,200,250,300,350,400,450,500];
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
        dlCounter.textContent = milestones[i];
        dlCounter.classList.add('tick');
        setTimeout(function () { dlCounter.classList.remove('tick'); }, 100);
        var speed;
        if (i < 5) speed = 220;
        else if (i < 10) speed = 140;
        else if (i < 15) speed = 80;
        else speed = 50;
        i++;
        setTimeout(tick, speed);
      }
      tick();
    }
  }

  // --- Parallax on hero phone ---
  var heroPhone = document.querySelector('.hero-phone');
  var heroSection = document.querySelector('.hero');

  if (heroPhone && heroSection) {
    function updateParallax() {
      var y = window.scrollY;
      var heroHeight = heroSection.offsetHeight;
      if (y < heroHeight) {
        var offset = y * 0.12;
        heroPhone.style.transform =
          'perspective(1000px) rotateY(-5deg) rotateX(2deg) translateY(' + offset + 'px)';
      }
    }
    window.addEventListener('scroll', updateParallax, { passive: true });
  }

  // --- Gallery horizontal scroll with mouse drag ---
  var galleryScroll = document.querySelector('.gallery-scroll');
  if (galleryScroll) {
    var isDown = false;
    var startX, scrollLeft;

    galleryScroll.addEventListener('mousedown', function (e) {
      isDown = true;
      galleryScroll.style.cursor = 'grabbing';
      startX = e.pageX - galleryScroll.offsetLeft;
      scrollLeft = galleryScroll.scrollLeft;
    });
    galleryScroll.addEventListener('mouseleave', function () {
      isDown = false;
      galleryScroll.style.cursor = '';
    });
    galleryScroll.addEventListener('mouseup', function () {
      isDown = false;
      galleryScroll.style.cursor = '';
    });
    galleryScroll.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - galleryScroll.offsetLeft;
      var walk = (x - startX) * 1.5;
      galleryScroll.scrollLeft = scrollLeft - walk;
    });
  }

  // --- Live Reddit Feed ---
  (function loadRedditFeed() {
    var container = document.getElementById('redditPosts');
    var header = document.querySelector('#redditFeed .reddit-preview-header span:last-child');
    if (!container) return;

    fetch('https://www.reddit.com/r/WorldNewsCards.json?limit=6&raw_json=1', {
        headers: { 'Accept': 'application/json' }
      })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      })
      .then(function (data) {
        var posts = data.data.children;
        if (!posts.length) { showFallback(); return; }
        if (header) header.textContent = 'Live from r/WorldNewsCards';
        container.innerHTML = '';

        posts.forEach(function (child) {
          var p = child.data;
          var score = p.score || 0;
          var comments = p.num_comments || 0;
          var flair = p.link_flair_text || '';
          var ago = timeAgo(p.created_utc);
          var thumb = p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : '';

          var item = document.createElement('a');
          item.href = 'https://www.reddit.com' + p.permalink;
          item.target = '_blank';
          item.rel = 'noopener';
          item.className = 'reddit-preview-item reddit-preview-item--live';

          item.innerHTML =
            '<div class="reddit-vote">' +
              '<span class="reddit-arrow">▲</span>' +
              '<span class="reddit-score">' + score + '</span>' +
            '</div>' +
            (thumb ? '<img class="reddit-thumb" src="' + thumb + '" alt="" />' : '') +
            '<div class="reddit-item-body">' +
              '<p class="reddit-item-title">' + escapeHtml(p.title) + '</p>' +
              '<span class="reddit-item-meta">' +
                (flair ? '<span class="reddit-flair">' + escapeHtml(flair) + '</span> · ' : '') +
                ago + ' · ' + comments + ' comment' + (comments !== 1 ? 's' : '') +
              '</span>' +
            '</div>';

          container.appendChild(item);
        });
      })
      .catch(showFallback);

    function showFallback() {
      if (header) header.textContent = 'Live discussions & geopolitics updates';
      container.innerHTML =
        '<a href="https://www.reddit.com/r/WorldNewsCards/" target="_blank" rel="noopener" class="reddit-preview-item">' +
          '<div class="reddit-vote"><span class="reddit-arrow">▲</span></div>' +
          '<div class="reddit-item-body"><p class="reddit-item-title">Visit r/WorldNewsCards for live geopolitics discussions, conflict monitoring, and community analysis.</p>' +
          '<span class="reddit-item-meta">Community · Join the conversation</span></div>' +
        '</a>';
    }

    function escapeHtml(s) {
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    function timeAgo(epoch) {
      var diff = Math.floor(Date.now() / 1000) - epoch;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
      return Math.floor(diff / 604800) + 'w ago';
    }
  })();

  // --- Floating Download Button (show after hero, hide at final CTA) ---
  var fab = document.getElementById('fabDownload');
  var ctaSection = document.querySelector('.cta-final');
  if (fab) {
    function updateFab() {
      var scrollY = window.scrollY;
      var pastHero = scrollY > window.innerHeight * 0.6;
      var atCta = ctaSection && ctaSection.getBoundingClientRect().top < window.innerHeight;
      fab.classList.toggle('visible', pastHero && !atCta);
    }
    window.addEventListener('scroll', updateFab, { passive: true });
    updateFab();
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        var offset = navbar.offsetHeight + 20;
        var top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

})();
