#!/bin/bash
# Build script: generates conflict pages, conflicts index, blog index, and sitemap
# Run: bash build.sh

set -e
SITE_URL="https://insnaps.app"
PLAY_STORE="https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree&hl=en_IN"
DATA_FILE="_data/conflicts.json"
NOW=$(date -u +"%Y-%m-%dT%H:%M:%S+00:00")
YEAR=$(date +"%Y")

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required"; exit 1
fi

echo "==> Building conflict pages..."

python3 -c "
import json, os, html

with open('$DATA_FILE') as f:
    conflicts = json.load(f)

for c in conflicts:
    slug = c['slug']
    out_dir = f'conflicts/{slug}'
    os.makedirs(out_dir, exist_ok=True)

    parties_html = ''.join(f'<span class=\"party-tag\">{html.escape(p)}</span>' for p in c.get('parties', []))
    severity_class = c.get('severity', 'limited')
    esc = lambda s: html.escape(str(s))

    page = f'''<!DOCTYPE html>
<html lang=\"en\" data-theme=\"dark\">
<head>
  <script async src=\"https://www.googletagmanager.com/gtag/js?id=G-HQQCZ7SLN5\"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','G-HQQCZ7SLN5');</script>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>{esc(c['seoTitle'])}</title>
  <meta name=\"description\" content=\"{esc(c['summary'][:160])}\">
  <meta name=\"keywords\" content=\"{esc(c.get('keywords',''))}\">
  <meta name=\"robots\" content=\"index, follow\">
  <link rel=\"canonical\" href=\"$SITE_URL/conflicts/{slug}/\">
  <link rel=\"icon\" type=\"image/png\" href=\"/logo.png\">
  <meta name=\"google-play-app\" content=\"app-id=com.prakshaappthree.appthree\">
  <meta property=\"og:title\" content=\"{esc(c['seoTitle'])}\">
  <meta property=\"og:description\" content=\"{esc(c['summary'][:200])}\">
  <meta property=\"og:image\" content=\"$SITE_URL/insnaps_og.png\">
  <meta property=\"og:url\" content=\"$SITE_URL/conflicts/{slug}/\">
  <meta property=\"og:type\" content=\"article\">
  <meta name=\"twitter:card\" content=\"summary_large_image\">
  <meta name=\"twitter:title\" content=\"{esc(c['seoTitle'])}\">
  <meta name=\"twitter:description\" content=\"{esc(c['summary'][:200])}\">
  <meta name=\"twitter:image\" content=\"$SITE_URL/insnaps_og.png\">
  <script type=\"application/ld+json\">
  {{
    \"@context\": \"https://schema.org\",
    \"@type\": \"Article\",
    \"headline\": \"{esc(c['title'])}\",
    \"description\": \"{esc(c['summary'][:200])}\",
    \"url\": \"$SITE_URL/conflicts/{slug}/\",
    \"publisher\": {{\"@type\": \"Organization\", \"name\": \"InSnaps\", \"url\": \"$SITE_URL\"}},
    \"mainEntityOfPage\": \"$SITE_URL/conflicts/{slug}/\"
  }}
  </script>
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"/style.css\">
  <link rel=\"stylesheet\" href=\"/conflict-page.css\">
</head>
<body>
  <nav class=\"navbar scrolled\" id=\"navbar\">
    <div class=\"nav-container\">
      <a href=\"/\" class=\"nav-logo\">
        <img src=\"/logo.png\" alt=\"InSnaps\" class=\"nav-logo-icon\" width=\"32\" height=\"32\">
        <span class=\"nav-logo-text\">InSnaps</span>
      </a>
      <div class=\"nav-links\" id=\"navLinks\">
        <a href=\"/#features\">Features</a>
        <a href=\"/conflicts/\">Conflicts</a>
        <a href=\"/blog/\">Blog</a>
        <a href=\"$PLAY_STORE\" target=\"_blank\" rel=\"noopener\" class=\"nav-cta\">Download Free</a>
      </div>
      <div class=\"nav-right\">
        <button class=\"theme-toggle\" id=\"themeToggle\" aria-label=\"Toggle light/dark mode\">
          <svg class=\"icon-sun\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"5\"/><path d=\"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42\"/></svg>
          <svg class=\"icon-moon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z\"/></svg>
        </button>
        <button class=\"nav-hamburger\" id=\"navHamburger\" aria-label=\"Open menu\">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>

  <main class=\"conflict-page\">
    <div class=\"container\">
      <nav class=\"breadcrumb\">
        <a href=\"/\">Home</a> &rsaquo; <a href=\"/conflicts/\">Conflicts</a> &rsaquo; <span>{esc(c['title'])}</span>
      </nav>

      <header class=\"conflict-header\">
        <div class=\"conflict-status-row\">
          <span class=\"severity-badge severity-{severity_class}\">{esc(c['status'])}</span>
          <span class=\"conflict-region\">{esc(c['region'])}</span>
        </div>
        <h1>{esc(c['h1'])}</h1>
        <p class=\"conflict-meta\">Tracking since {esc(str(c.get('startYear','')))} &middot; Updated regularly</p>
      </header>

      <section class=\"conflict-summary\">
        <h2>Overview</h2>
        <p>{esc(c['summary'])}</p>
      </section>

      <section class=\"conflict-parties\">
        <h2>Key Parties</h2>
        <div class=\"parties-list\">{parties_html}</div>
      </section>

      <section class=\"conflict-cta\">
        <div class=\"cta-card\">
          <h3>Track this conflict in real-time</h3>
          <p>Get live updates, interactive maps, and timeline data in the InSnaps app.</p>
          <a href=\"$PLAY_STORE\" target=\"_blank\" rel=\"noopener\" class=\"btn-primary\">
            <svg viewBox=\"0 0 24 24\" fill=\"currentColor\" width=\"20\" height=\"20\"><path d=\"M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.61-.92zm10.893 9.478l2.809-2.81-12.49-7.14 9.681 9.95zm-9.681 9.95l12.49-7.14-2.809-2.81-9.681 9.95zM20.16 11.18l-3.274-1.874-2.96 2.96 2.96 2.96 3.274-1.874c.86-.49.86-1.682 0-2.172z\"/></svg>
            Download InSnaps Free
          </a>
        </div>
      </section>

      <section class=\"conflict-disclaimer\">
        <p>This page provides a summary for informational purposes. For the latest real-time updates, open the InSnaps app. Sources include Reuters, BBC, Al Jazeera, UCDP, and other verified outlets.</p>
      </section>
    </div>
  </main>

  <footer class=\"site-footer\">
    <div class=\"container\">
      <div class=\"footer-bottom\">
        <p>&copy; $YEAR InSnaps. Built by <a href=\"https://x.com/BuildWtPrakhar\" target=\"_blank\" rel=\"noopener\">Prakhar Gupta</a>.</p>
      </div>
    </div>
  </footer>

  <script>
    (function(){{
      var html=document.documentElement,t=document.getElementById('themeToggle');
      var s=localStorage.getItem('insnaps-theme');
      if(s)html.setAttribute('data-theme',s);
      else if(window.matchMedia('(prefers-color-scheme:light)').matches)html.setAttribute('data-theme','light');
      t.addEventListener('click',function(){{var c=html.getAttribute('data-theme');var n=c==='dark'?'light':'dark';html.setAttribute('data-theme',n);localStorage.setItem('insnaps-theme',n)}});
      var h=document.getElementById('navHamburger'),nl=document.getElementById('navLinks');
      h.addEventListener('click',function(){{h.classList.toggle('open');nl.classList.toggle('open');document.body.style.overflow=nl.classList.contains('open')?'hidden':''}});
    }})();
  </script>
</body>
</html>'''

    with open(os.path.join(out_dir, 'index.html'), 'w') as out:
        out.write(page)

print(f'  Generated {len(conflicts)} conflict pages')
"

echo "==> Building conflicts index..."

python3 -c "
import json, html

with open('$DATA_FILE') as f:
    conflicts = json.load(f)

regions = {}
for c in conflicts:
    r = c['region']
    regions.setdefault(r, []).append(c)

cards = ''
for c in sorted(conflicts, key=lambda x: {'critical':0,'significant':1,'limited':2}.get(x.get('severity','limited'),3)):
    esc = lambda s: html.escape(str(s))
    sev = c.get('severity','limited')
    cards += f'''
      <a href=\"/conflicts/{c['slug']}/\" class=\"conflict-index-card severity-border-{sev}\">
        <div class=\"conflict-index-status\"><span class=\"severity-dot severity-{sev}\"></span>{esc(c['status'])}</div>
        <h3>{esc(c['title'])}</h3>
        <p>{esc(c['summary'][:120])}...</p>
        <span class=\"conflict-index-region\">{esc(c['region'])}</span>
      </a>'''

page = f'''<!DOCTYPE html>
<html lang=\"en\" data-theme=\"dark\">
<head>
  <script async src=\"https://www.googletagmanager.com/gtag/js?id=G-HQQCZ7SLN5\"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','G-HQQCZ7SLN5');</script>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Active Conflicts & Wars in $YEAR — Global Conflict Tracker | InSnaps</title>
  <meta name=\"description\" content=\"Track all active conflicts and wars worldwide in $YEAR. Interactive conflict map, live updates from Reuters, BBC, UCDP. Monitor 30+ ongoing wars and crises.\">
  <meta name=\"keywords\" content=\"active conflicts 2026, ongoing wars 2026, list of active conflicts, global conflict tracker, world wars map, conflict monitor\">
  <meta name=\"robots\" content=\"index, follow\">
  <link rel=\"canonical\" href=\"$SITE_URL/conflicts/\">
  <link rel=\"icon\" type=\"image/png\" href=\"/logo.png\">
  <meta name=\"google-play-app\" content=\"app-id=com.prakshaappthree.appthree\">
  <meta property=\"og:title\" content=\"Active Conflicts & Wars in $YEAR | InSnaps\">
  <meta property=\"og:description\" content=\"Track all active conflicts worldwide. 30+ wars monitored in real-time.\">
  <meta property=\"og:url\" content=\"$SITE_URL/conflicts/\">
  <meta property=\"og:type\" content=\"website\">
  <meta property=\"og:image\" content=\"$SITE_URL/insnaps_og.png\">
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"/style.css\">
  <link rel=\"stylesheet\" href=\"/conflict-page.css\">
</head>
<body>
  <nav class=\"navbar scrolled\" id=\"navbar\">
    <div class=\"nav-container\">
      <a href=\"/\" class=\"nav-logo\">
        <img src=\"/logo.png\" alt=\"InSnaps\" class=\"nav-logo-icon\" width=\"32\" height=\"32\">
        <span class=\"nav-logo-text\">InSnaps</span>
      </a>
      <div class=\"nav-links\" id=\"navLinks\">
        <a href=\"/#features\">Features</a>
        <a href=\"/conflicts/\">Conflicts</a>
        <a href=\"/blog/\">Blog</a>
        <a href=\"$PLAY_STORE\" target=\"_blank\" rel=\"noopener\" class=\"nav-cta\">Download Free</a>
      </div>
      <div class=\"nav-right\">
        <button class=\"theme-toggle\" id=\"themeToggle\" aria-label=\"Toggle light/dark mode\">
          <svg class=\"icon-sun\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"5\"/><path d=\"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42\"/></svg>
          <svg class=\"icon-moon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z\"/></svg>
        </button>
        <button class=\"nav-hamburger\" id=\"navHamburger\" aria-label=\"Open menu\"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>

  <main class=\"conflict-page\">
    <div class=\"container\">
      <nav class=\"breadcrumb\"><a href=\"/\">Home</a> &rsaquo; <span>Conflicts</span></nav>
      <header class=\"conflict-header\" style=\"margin-bottom:3rem\">
        <h1>Active Conflicts & Wars — {$YEAR}</h1>
        <p class=\"conflict-meta\">Tracking {len(conflicts)} conflicts and crises worldwide. Updated regularly.</p>
      </header>
      <div class=\"conflicts-index-grid\">{cards}
      </div>
      <section class=\"conflict-cta\" style=\"margin-top:3rem\">
        <div class=\"cta-card\">
          <h3>Track all conflicts in real-time</h3>
          <p>Get live updates, interactive maps, and personalized alerts in the InSnaps app.</p>
          <a href=\"$PLAY_STORE\" target=\"_blank\" rel=\"noopener\" class=\"btn-primary\">Download InSnaps Free</a>
        </div>
      </section>
    </div>
  </main>

  <footer class=\"site-footer\">
    <div class=\"container\"><div class=\"footer-bottom\">
      <p>&copy; $YEAR InSnaps. Built by <a href=\"https://x.com/BuildWtPrakhar\" target=\"_blank\" rel=\"noopener\">Prakhar Gupta</a>.</p>
    </div></div>
  </footer>

  <script>
    (function(){{
      var html=document.documentElement,t=document.getElementById('themeToggle');
      var s=localStorage.getItem('insnaps-theme');
      if(s)html.setAttribute('data-theme',s);
      else if(window.matchMedia('(prefers-color-scheme:light)').matches)html.setAttribute('data-theme','light');
      t.addEventListener('click',function(){{var c=html.getAttribute('data-theme');var n=c==='dark'?'light':'dark';html.setAttribute('data-theme',n);localStorage.setItem('insnaps-theme',n)}});
      var h=document.getElementById('navHamburger'),nl=document.getElementById('navLinks');
      h.addEventListener('click',function(){{h.classList.toggle('open');nl.classList.toggle('open');document.body.style.overflow=nl.classList.contains('open')?'hidden':''}});
    }})();
  </script>
</body>
</html>'''

import os
os.makedirs('conflicts', exist_ok=True)
with open('conflicts/index.html', 'w') as f:
    f.write(page)
print('  Generated conflicts index')
"

echo "==> Building blog index..."
mkdir -p blog
cat > blog/index.html << 'BLOGEOF'
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HQQCZ7SLN5"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','G-HQQCZ7SLN5');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — Geopolitics Analysis & Conflict Insights | InSnaps</title>
  <meta name="description" content="Weekly geopolitics analysis, conflict updates, data-driven articles about wars, sanctions, diplomacy, and global security from the InSnaps team.">
  <link rel="canonical" href="https://insnaps.app/blog/">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta name="google-play-app" content="app-id=com.prakshaappthree.appthree">
  <meta property="og:title" content="InSnaps Blog — Geopolitics Analysis & Conflict Insights">
  <meta property="og:description" content="Weekly data-driven analysis of global conflicts, wars, and geopolitics.">
  <meta property="og:url" content="https://insnaps.app/blog/">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/conflict-page.css">
</head>
<body>
  <nav class="navbar scrolled" id="navbar">
    <div class="nav-container">
      <a href="/" class="nav-logo">
        <img src="/logo.png" alt="InSnaps" class="nav-logo-icon" width="32" height="32">
        <span class="nav-logo-text">InSnaps</span>
      </a>
      <div class="nav-links" id="navLinks">
        <a href="/#features">Features</a>
        <a href="/conflicts/">Conflicts</a>
        <a href="/blog/">Blog</a>
        <a href="https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree&hl=en_IN" target="_blank" rel="noopener" class="nav-cta">Download Free</a>
      </div>
      <div class="nav-right">
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle light/dark mode">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <button class="nav-hamburger" id="navHamburger" aria-label="Open menu"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>

  <main class="conflict-page">
    <div class="container">
      <nav class="breadcrumb"><a href="/">Home</a> &rsaquo; <span>Blog</span></nav>
      <header class="conflict-header" style="margin-bottom:3rem">
        <h1>InSnaps Blog</h1>
        <p class="conflict-meta">Geopolitics analysis, conflict insights, and data-driven reporting.</p>
      </header>

      <div class="blog-coming-soon">
        <div class="cta-card">
          <h3>Coming Soon</h3>
          <p>We're preparing our first articles. Check back soon for data-driven analysis of global conflicts, weekly briefings, and in-depth geopolitics coverage.</p>
          <p style="margin-top:1rem;color:var(--fg-muted);font-size:0.9rem;">In the meantime, follow us on <a href="https://www.reddit.com/r/WorldNewsCards/" target="_blank" rel="noopener">Reddit</a> and <a href="https://x.com/BuildWtPrakhar" target="_blank" rel="noopener">X (Twitter)</a> for updates.</p>
        </div>
      </div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container"><div class="footer-bottom">
      <p>&copy; 2026 InSnaps. Built by <a href="https://x.com/BuildWtPrakhar" target="_blank" rel="noopener">Prakhar Gupta</a>.</p>
    </div></div>
  </footer>

  <script>
    (function(){
      var html=document.documentElement,t=document.getElementById('themeToggle');
      var s=localStorage.getItem('insnaps-theme');
      if(s)html.setAttribute('data-theme',s);
      else if(window.matchMedia('(prefers-color-scheme:light)').matches)html.setAttribute('data-theme','light');
      t.addEventListener('click',function(){var c=html.getAttribute('data-theme');var n=c==='dark'?'light':'dark';html.setAttribute('data-theme',n);localStorage.setItem('insnaps-theme',n)});
      var h=document.getElementById('navHamburger'),nl=document.getElementById('navLinks');
      h.addEventListener('click',function(){h.classList.toggle('open');nl.classList.toggle('open');document.body.style.overflow=nl.classList.contains('open')?'hidden':''});
    })();
  </script>
</body>
</html>
BLOGEOF
echo "  Generated blog index"

echo "==> Building sitemap.xml..."

python3 -c "
import json
from datetime import datetime

with open('$DATA_FILE') as f:
    conflicts = json.load(f)

now = '$NOW'
urls = [
    ('$SITE_URL/', '1.0', 'weekly'),
    ('$SITE_URL/conflicts/', '0.9', 'weekly'),
    ('$SITE_URL/blog/', '0.8', 'weekly'),
    ('$SITE_URL/support/', '0.75', 'monthly'),
]
for c in conflicts:
    urls.append(('$SITE_URL/conflicts/' + c['slug'] + '/', '0.7', 'weekly'))

xml = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n'
xml += '<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n'
for url, priority, freq in urls:
    xml += f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{now}</lastmod>\n    <changefreq>{freq}</changefreq>\n    <priority>{priority}</priority>\n  </url>\n'
xml += '</urlset>\n'

with open('sitemap.xml', 'w') as f:
    f.write(xml)
print(f'  Generated sitemap with {len(urls)} URLs')
"

echo "==> Building blog posts from RSS..."
python3 _scripts/generate_blog.py

echo "==> Build complete!"
echo "    - $(ls conflicts/*/index.html 2>/dev/null | wc -l | tr -d ' ') conflict pages"
echo "    - conflicts/index.html"
echo "    - blog/index.html"
echo "    - sitemap.xml"
