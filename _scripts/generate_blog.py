#!/usr/bin/env python3
"""
Generate blog posts from RSS feeds of geopolitics/conflict news.
Creates curated roundup-style posts linking to original sources,
with InSnaps CTA at the bottom.

Usage: python3 _scripts/generate_blog.py
"""

import urllib.request
import xml.etree.ElementTree as ET
import html
import os
import json
from datetime import datetime, timezone

SITE_URL = "https://insnaps.app"
PLAY_STORE = "https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree&hl=en_IN"
BLOG_DIR = "blog"
YEAR = datetime.now().year

RSS_FEEDS = {
    "global-conflicts": {
        "title": "Global Conflicts & Wars — Weekly Roundup",
        "seo_title": "Global Conflicts Update — Wars & Crisis News This Week | InSnaps",
        "description": "Latest updates on active conflicts, wars, and humanitarian crises around the world. Curated from top news sources.",
        "keywords": "global conflicts update, wars this week, conflict news, humanitarian crisis, world wars update",
        "url": "https://news.google.com/rss/search?q=global+conflicts+wars+crisis&hl=en-US&gl=US&ceid=US:en",
    },
    "ukraine-russia-war": {
        "title": "Ukraine-Russia War — Latest Developments",
        "seo_title": "Ukraine-Russia War Update — Latest News & Analysis | InSnaps",
        "description": "The latest developments in the Russia-Ukraine war, including frontline updates, diplomacy, and international response.",
        "keywords": "ukraine war update, russia ukraine news, ukraine conflict latest, ukraine war 2026",
        "url": "https://news.google.com/rss/search?q=ukraine+russia+war&hl=en-US&gl=US&ceid=US:en",
    },
    "middle-east-conflict": {
        "title": "Middle East Conflicts — Latest Updates",
        "seo_title": "Middle East Conflict Update — Gaza, Yemen, Iran News | InSnaps",
        "description": "Latest news from Middle East conflicts including Israel-Palestine, Yemen, Iran tensions, and regional security.",
        "keywords": "middle east conflict, gaza war, yemen houthi, iran tensions, israel palestine update",
        "url": "https://news.google.com/rss/search?q=middle+east+conflict+war&hl=en-US&gl=US&ceid=US:en",
    },
    "geopolitics-sanctions": {
        "title": "Geopolitics & Sanctions — This Week",
        "seo_title": "Geopolitics & Sanctions Update — Global Political News | InSnaps",
        "description": "Key geopolitical developments, sanctions updates, and international relations news from around the world.",
        "keywords": "geopolitics news, sanctions update, international relations, global politics, diplomacy news",
        "url": "https://news.google.com/rss/search?q=geopolitics+sanctions+diplomacy&hl=en-US&gl=US&ceid=US:en",
    },
    "africa-conflicts": {
        "title": "Africa Conflicts — Overlooked Crises Update",
        "seo_title": "Africa Conflicts Update — Sudan, Congo, Sahel Crisis News | InSnaps",
        "description": "Updates on Africa's overlooked conflicts: Sudan civil war, DR Congo, Sahel crisis, and more.",
        "keywords": "africa conflicts, sudan war, congo crisis, sahel conflict, africa war update",
        "url": "https://news.google.com/rss/search?q=africa+conflict+war+crisis+sudan+congo&hl=en-US&gl=US&ceid=US:en",
    },
    "military-defense-news": {
        "title": "Military & Defense — Global Updates",
        "seo_title": "Military & Defense News — Arms, Operations & Analysis | InSnaps",
        "description": "Latest military and defense news: arms deals, military operations, defense budgets, and strategic developments.",
        "keywords": "military news, defense news, arms deals, military operations, defense budget",
        "url": "https://news.google.com/rss/search?q=military+defense+news+arms&hl=en-US&gl=US&ceid=US:en",
    },
}

def fetch_rss(url, max_items=8):
    """Fetch and parse RSS feed, return list of article dicts."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "InSnaps-BlogBuilder/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        root = ET.fromstring(data)
        items = []
        for item in root.findall(".//item")[:max_items]:
            title = item.findtext("title", "").strip()
            link = item.findtext("link", "").strip()
            pub_date = item.findtext("pubDate", "").strip()
            desc = item.findtext("description", "").strip()
            # Clean HTML from description
            desc = html.unescape(desc)
            # Strip HTML tags crudely
            import re
            desc = re.sub(r'<[^>]+>', '', desc).strip()
            if len(desc) > 200:
                desc = desc[:200].rsplit(' ', 1)[0] + '...'
            source = ""
            source_el = item.find("source")
            if source_el is not None:
                source = source_el.text or source_el.get("url", "")
            items.append({
                "title": title,
                "link": link,
                "pubDate": pub_date,
                "description": desc,
                "source": source,
            })
        return items
    except Exception as e:
        print(f"  Warning: Could not fetch {url}: {e}")
        return []


def format_date(pub_date_str):
    """Parse RSS date string into readable format."""
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(pub_date_str)
        return dt.strftime("%B %d, %Y")
    except:
        return pub_date_str


def generate_blog_post(slug, config, articles):
    """Generate an HTML blog post page."""
    today = datetime.now().strftime("%B %d, %Y")
    today_iso = datetime.now().strftime("%Y-%m-%d")
    esc = html.escape

    articles_html = ""
    for i, a in enumerate(articles):
        date_str = format_date(a["pubDate"]) if a["pubDate"] else ""
        source_str = f' &middot; {esc(a["source"])}' if a["source"] else ""
        articles_html += f'''
        <article class="blog-article-item">
          <h3><a href="{esc(a['link'])}" target="_blank" rel="noopener">{esc(a['title'])}</a></h3>
          <p class="blog-article-meta">{esc(date_str)}{source_str}</p>
          <p>{esc(a['description'])}</p>
        </article>'''

    if not articles_html:
        articles_html = '''
        <div class="blog-no-articles">
          <p>Articles are being fetched. Check back shortly for curated conflict and geopolitics news.</p>
        </div>'''

    page = f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HQQCZ7SLN5"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','G-HQQCZ7SLN5');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(config['seo_title'])}</title>
  <meta name="description" content="{esc(config['description'])}">
  <meta name="keywords" content="{esc(config['keywords'])}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="{SITE_URL}/blog/{slug}/">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta name="google-play-app" content="app-id=com.prakshaappthree.appthree">
  <meta property="og:title" content="{esc(config['seo_title'])}">
  <meta property="og:description" content="{esc(config['description'])}">
  <meta property="og:image" content="{SITE_URL}/insnaps_og.png">
  <meta property="og:url" content="{SITE_URL}/blog/{slug}/">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{esc(config['seo_title'])}">
  <meta name="twitter:description" content="{esc(config['description'])}">
  <meta name="twitter:image" content="{SITE_URL}/insnaps_og.png">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "{esc(config['title'])}",
    "description": "{esc(config['description'])}",
    "datePublished": "{today_iso}",
    "dateModified": "{today_iso}",
    "url": "{SITE_URL}/blog/{slug}/",
    "publisher": {{"@type": "Organization", "name": "InSnaps", "url": "{SITE_URL}"}},
    "author": {{"@type": "Person", "name": "Prakhar Gupta"}}
  }}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/conflict-page.css">
  <link rel="stylesheet" href="/blog.css">
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
        <a href="{PLAY_STORE}" target="_blank" rel="noopener" class="nav-cta">Download Free</a>
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
      <nav class="breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/blog/">Blog</a> &rsaquo; <span>{esc(config['title'])}</span></nav>

      <header class="blog-post-header">
        <h1>{esc(config['title'])}</h1>
        <p class="blog-post-meta">Last updated: {today} &middot; Curated by InSnaps</p>
        <p class="blog-post-desc">{esc(config['description'])}</p>
      </header>

      <div class="blog-articles">
        {articles_html}
      </div>

      <section class="conflict-cta">
        <div class="cta-card">
          <h3>Track these stories in real-time</h3>
          <p>Get live updates, conflict maps, and personalized geopolitics news in the InSnaps app.</p>
          <a href="{PLAY_STORE}" target="_blank" rel="noopener" class="btn-primary">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.61-.92zm10.893 9.478l2.809-2.81-12.49-7.14 9.681 9.95zm-9.681 9.95l12.49-7.14-2.809-2.81-9.681 9.95zM20.16 11.18l-3.274-1.874-2.96 2.96 2.96 2.96 3.274-1.874c.86-.49.86-1.682 0-2.172z"/></svg>
            Download InSnaps Free
          </a>
        </div>
      </section>

      <section class="conflict-disclaimer">
        <p>This roundup curates headlines from verified sources including Reuters, BBC, Al Jazeera, and others via Google News. All links open the original articles on their respective publishers' websites. InSnaps does not claim authorship of linked content.</p>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container"><div class="footer-bottom">
      <p>&copy; {YEAR} InSnaps. Built by <a href="https://x.com/BuildWtPrakhar" target="_blank" rel="noopener">Prakhar Gupta</a>.</p>
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
    return page


def generate_blog_index(posts_meta):
    """Generate the blog index page with links to all posts."""
    today = datetime.now().strftime("%B %d, %Y")
    esc = html.escape

    cards = ""
    for pm in posts_meta:
        cards += f'''
      <a href="/blog/{pm['slug']}/" class="blog-index-card">
        <h3>{esc(pm['title'])}</h3>
        <p>{esc(pm['description'][:150])}</p>
        <span class="blog-card-meta">Updated {today} &middot; {pm['count']} articles</span>
      </a>'''

    page = f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HQQCZ7SLN5"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','G-HQQCZ7SLN5');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — Geopolitics Analysis & Conflict Insights | InSnaps</title>
  <meta name="description" content="Weekly geopolitics analysis, conflict updates, data-driven articles about wars, sanctions, diplomacy, and global security.">
  <meta name="keywords" content="geopolitics blog, conflict analysis, war news, sanctions update, military news, diplomacy">
  <link rel="canonical" href="{SITE_URL}/blog/">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta name="google-play-app" content="app-id=com.prakshaappthree.appthree">
  <meta property="og:title" content="InSnaps Blog — Geopolitics Analysis & Conflict Insights">
  <meta property="og:description" content="Weekly data-driven analysis of global conflicts, wars, and geopolitics.">
  <meta property="og:url" content="{SITE_URL}/blog/">
  <meta property="og:image" content="{SITE_URL}/insnaps_og.png">
  <meta property="og:type" content="website">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/conflict-page.css">
  <link rel="stylesheet" href="/blog.css">
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
        <a href="{PLAY_STORE}" target="_blank" rel="noopener" class="nav-cta">Download Free</a>
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
        <p class="conflict-meta">Geopolitics analysis, conflict insights, and curated news roundups. Updated regularly.</p>
      </header>

      <div class="blog-index-grid">{cards}
      </div>

      <section class="conflict-cta" style="margin-top:3rem">
        <div class="cta-card">
          <h3>Get real-time updates in the app</h3>
          <p>Track 30+ conflicts live with interactive maps, ranked feeds, and personalized alerts.</p>
          <a href="{PLAY_STORE}" target="_blank" rel="noopener" class="btn-primary">Download InSnaps Free</a>
        </div>
      </section>
    </div>
  </main>

  <footer class="site-footer">
    <div class="container"><div class="footer-bottom">
      <p>&copy; {YEAR} InSnaps. Built by <a href="https://x.com/BuildWtPrakhar" target="_blank" rel="noopener">Prakhar Gupta</a>.</p>
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
    return page


def main():
    posts_meta = []

    for slug, config in RSS_FEEDS.items():
        print(f"  Fetching: {config['title']}...")
        articles = fetch_rss(config["url"])
        print(f"    Got {len(articles)} articles")

        out_dir = os.path.join(BLOG_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)

        page_html = generate_blog_post(slug, config, articles)
        with open(os.path.join(out_dir, "index.html"), "w") as f:
            f.write(page_html)

        posts_meta.append({
            "slug": slug,
            "title": config["title"],
            "description": config["description"],
            "count": len(articles),
        })

    # Generate blog index
    index_html = generate_blog_index(posts_meta)
    with open(os.path.join(BLOG_DIR, "index.html"), "w") as f:
        f.write(index_html)

    print(f"\n  Generated {len(posts_meta)} blog posts + index")

    # Update sitemap to include blog posts
    sitemap_entries = []
    for pm in posts_meta:
        sitemap_entries.append(f"{SITE_URL}/blog/{pm['slug']}/")

    # Read existing sitemap and append blog URLs
    try:
        with open("sitemap.xml", "r") as f:
            existing = f.read()

        for url in sitemap_entries:
            if url not in existing:
                entry = f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.6</priority>\n  </url>\n'
                existing = existing.replace("</urlset>", entry + "</urlset>")

        with open("sitemap.xml", "w") as f:
            f.write(existing)
        print("  Updated sitemap.xml with blog URLs")
    except Exception as e:
        print(f"  Warning: Could not update sitemap: {e}")


if __name__ == "__main__":
    main()
