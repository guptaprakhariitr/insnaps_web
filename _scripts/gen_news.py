#!/usr/bin/env python3
"""Render InSnaps' own reporting into /news/<slug>/ pages.

This is the one section of the site whose subject is *not* InSnaps. /blog/ and
/answers/ are marketing surfaces that argue for the product; /news/ carries
original reporting on companies, launches, events and the industries around
them. That difference drives every choice here:

  - The schema type is NewsArticle, not BlogPosting, and it declares `about`
    with the real entity being written about (a company's own name and URL), so
    a crawler links the story to the subject rather than to the publisher.
  - Every story must carry a `## Sources` section. A page that reports on a
    third party without saying where the facts came from is the exact thing the
    copy rules exist to prevent, so a missing Sources block fails the build.
  - Front matter is explicit rather than sniffed out of the prose. Reporting has
    a dateline, a section and a subject; guessing those from an H1 is how you
    end up publishing a story attributed to the wrong company.

Authored markdown lives in `_content/news/*.md` and is committed, same as
`_content/blog/` — this repo is what CI builds, so nothing is rendered from a
source that CI cannot see.

Run from repo root:  python3 _scripts/gen_news.py
"""
import html
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_answers import render_markdown, NAV, THEME_SCRIPT  # noqa: E402
from gen_blog_posts import (  # noqa: E402
    ORG_ID, ORGANIZATION_NODE, first_paragraph_text, iso_date, seo_title,
    site_relative, smart_quotes,
)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_DIR = os.path.join(ROOT, "_content", "news")
OUT_DIR = os.path.join(ROOT, "news")
COVER_DIR = os.path.join(OUT_DIR, "assets")
SITE_URL = "https://insnaps.app"
APP_NAME = "InSnaps"
GA_ID = "G-HQQCZ7SLN5"
PLAY_STORE = "https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree"
APP_STORE = "https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049"

WORDS_PER_MIN = 220

# The desk a story belongs to. Kept closed on purpose: a free-text section field
# produces "Company", "Companies" and "company news" as three separate desks in
# the index within a month.
SECTIONS = {
    "companies": "Companies",
    "events": "Events",
    "launches": "Launches",
    "markets": "Markets",
    "media": "Media",
    "policy": "Policy",
}


# ───────────────────────── parsing ─────────────────────────

def parse_front_matter(raw):
    """Read the leading `---` block. Returns (front, body).

    Deliberately not YAML: no dependency, and the accepted shape is small
    enough that a hand-rolled reader gives better errors than a parser would.
    Repeated keys accumulate into a list, which is how `source:` lines work.
    """
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", raw, re.S)
    if not m:
        return {}, raw
    front = {}
    for line in m.group(1).split("\n"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"front matter line is not `key: value`: {line!r}")
        k, v = line.split(":", 1)
        k, v = k.strip().lower(), v.strip()
        if k in front:
            if not isinstance(front[k], list):
                front[k] = [front[k]]
            front[k].append(v)
        else:
            front[k] = v
    return front, raw[m.end():]


def as_list(value):
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def check_sources(body_md, slug):
    """A report on someone else has to say where it came from."""
    if not re.search(r"\n##\s*Sources\s*\n", body_md, re.I):
        raise ValueError(
            f"{slug}: no '## Sources' section. Reporting on a third party without "
            "citing where the facts came from does not get published.")


# ───────────────────────── cover art ─────────────────────────

# A separate palette from /blog/'s so a news card is not mistaken for an
# opinion post at a glance in a search result.
COVER_ACCENTS = [
    (18, 82, 56),     # brand orange
    (204, 42, 46),    # slate blue
    (168, 44, 42),    # sea green
    (44, 74, 52),     # brass
    (280, 38, 54),    # violet
]


def make_cover(slug, section, taken=None):
    """Draw a flat editorial cover: ruled field, a corner block, a section band.

    No text in the SVG. A generated headline burnt into cover art is wrong the
    moment the headline is edited, and it cannot be translated.
    """
    h = 0
    for ch in slug:
        h = (h * 31 + ord(ch)) & 0x7FFFFFFF

    n = h % len(COVER_ACCENTS)
    if taken is not None:
        for _ in range(len(COVER_ACCENTS)):
            if n not in taken:
                break
            n = (n + 1) % len(COVER_ACCENTS)
        taken.add(n)
    hue, sat, lum = COVER_ACCENTS[n]
    accent = f"hsl({hue} {sat}% {lum}%)"

    flip = (h >> 5) % 2
    rules = "".join(
        f'<line x1="0" y1="{y}" x2="1200" y2="{y}" stroke-width="1"/>'
        for y in range(40, 675, 34))
    bx = 792 if flip else 96
    blocks = "".join(
        f'<rect x="{bx + (i % 3) * 116}" y="{150 + (i // 3) * 116}" width="96" height="96" '
        f'rx="10" fill="{accent}" fill-opacity="{0.5 - (i * 0.055):.3f}"/>'
        for i in range(6))

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img">
  <defs>
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#151c27"/>
      <stop offset="1" stop-color="#090d13"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#ink)"/>
  <g stroke="#ffffff" stroke-opacity=".05">{rules}</g>
  {blocks}
  <rect x="96" y="88" width="150" height="6" rx="3" fill="{accent}"/>
  <rect x="0" y="669" width="1200" height="6" fill="{accent}" fill-opacity=".9"/>
</svg>
'''
    os.makedirs(COVER_DIR, exist_ok=True)
    with open(os.path.join(COVER_DIR, f"{slug}-cover.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    return f"{SITE_URL}/news/assets/{slug}-cover.svg"


# ───────────────────────── page ─────────────────────────

def article_page(meta, body_html, ld_json, updated_iso):
    e = lambda s: html.escape(str(s), quote=True)
    slug = meta["slug"]
    url = f"{SITE_URL}/news/{slug}/"
    img = meta.get("image") or f"{SITE_URL}/insnaps_og.png"
    dateline = meta.get("dateline") or ""
    about = ""
    if meta.get("about_name"):
        target = meta.get("about_url")
        name = e(meta["about_name"])
        # rel="nofollow" on the subject link: this is a report, not an
        # endorsement, and /news/ should not become a link farm for whoever
        # gets written about.
        link = (f'<a href="{e(target)}" target="_blank" rel="noopener nofollow">{name}</a>'
                if target else name)
        about = (f'<p class="news-about">This story is about {link}. '
                 f'{APP_NAME} has no commercial relationship with them.</p>')

    return f"""<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{GA_ID}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(meta['title'])} | {APP_NAME} News</title>
  <meta name="description" content="{e(meta['description'])}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta name="google-play-app" content="app-id=com.prakshaappthree.appthree">
  <meta name="apple-itunes-app" content="app-id=6762338049">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{e(meta['title'])}">
  <meta property="og:description" content="{e(meta['description'])}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{e(img)}">
  <meta property="article:section" content="{e(meta['section'])}">
  <meta property="article:published_time" content="{meta['published_iso']}">
  <meta property="article:modified_time" content="{updated_iso}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(meta['title'])}">
  <meta name="twitter:description" content="{e(meta['description'])}">
  <meta name="twitter:image" content="{e(img)}">
  <script type="application/ld+json">{json.dumps(ld_json, ensure_ascii=False)}</script>
  <link rel="alternate" type="application/rss+xml" title="{APP_NAME} News" href="/news/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/blogpost.css">
  <link rel="stylesheet" href="/news.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{NAV}
  <div class="post-progress" aria-hidden="true"><i id="postProgress"></i></div>
  <main class="post-page">
    <header class="post-head">
      <nav class="post-crumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span aria-hidden="true">›</span> <a href="/news/">News</a>
      </nav>
      <span class="news-kicker">{e(meta['section'])}</span>
      <h1>{html.escape(meta['h1'], quote=False)}</h1>
      <p class="post-meta">{(e(dateline) + " &middot; ") if dateline else ""}{e(meta.get('published', ''))} &middot; {meta['read_min']} min read</p>
    </header>
    <figure class="post-hero">
      <img src="{e(site_relative(img))}" alt="" width="1200" height="675" fetchpriority="high" decoding="async">
    </figure>
    <p class="post-back"><a href="/news/">← All news</a></p>
    <article class="ans-article post-body news-body">
      {about}
      {body_html}
      <aside class="ans-cta">
        <h2>Follow stories like this as they break</h2>
        <p>{APP_NAME} carries your town and the world in one feed — across 32 topic domains, narrated if you want it.</p>
        <div class="ans-cta-row">
          <a class="btn-primary" href="/">Try it on your city</a>
          <a class="btn-secondary" href="{APP_STORE}" target="_blank" rel="noopener">App Store</a>
          <a class="btn-secondary" href="{PLAY_STORE}" target="_blank" rel="noopener">Google Play</a>
        </div>
      </aside>
    </article>
  </main>
  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {datetime.now(timezone.utc).year} {APP_NAME} &middot; <a href="/">Home</a> &middot; <a href="/news/">News</a> &middot; <a href="/blog/">Blog</a> &middot; <a href="/answers/">Answers</a> &middot; <a href="/live/">Live</a> &middot; <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{THEME_SCRIPT}
  <script>
    // Reading progress, measured against the article body so the bar completes
    // when the reader finishes the text rather than the footer.
    (function () {{
      var bar = document.getElementById('postProgress');
      var body = document.querySelector('.post-body');
      var nav = document.querySelector('.navbar');
      if (!bar || !body) return;
      if (nav) {{
        var setNav = function () {{
          document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
        }};
        setNav();
        addEventListener('resize', setNav, {{ passive: true }});
      }}
      var ticking = false;
      function update() {{
        ticking = false;
        var top = body.offsetTop;
        var span = body.offsetHeight - innerHeight * 0.6;
        if (span <= 0) {{ bar.style.width = '100%'; return; }}
        var pct = (scrollY - top + innerHeight * 0.6) / span;
        bar.style.width = Math.max(0, Math.min(1, pct)) * 100 + '%';
      }}
      addEventListener('scroll', function () {{
        if (!ticking) {{ ticking = true; requestAnimationFrame(update); }}
      }}, {{ passive: true }});
      addEventListener('resize', update, {{ passive: true }});
      update();
    }})();
  </script>
  <script src="/viewbar.js"></script>
  <script>
    if (window.InSnapsViewBar) window.InSnapsViewBar.mount({{
      label: 'Get {APP_NAME}', sub: 'Your town and the world, in one feed'
    }});
  </script>
</body>
</html>
"""


# ───────────────────────── index + feed ─────────────────────────

INDEX_BLURB = ("Original reporting from the InSnaps desk on the companies, "
               "launches and events we think are worth writing down properly.")


def index_page(stories, updated_iso):
    e = lambda s: html.escape(str(s), quote=True)

    lead, rest = (stories[0], stories[1:]) if stories else (None, [])

    lead_html = ""
    if lead:
        lead_html = f'''      <a class="news-lead" href="/news/{e(lead["slug"])}/">
        <div class="news-lead-media"><img src="{e(site_relative(lead.get("image")))}" alt="" width="1200" height="675" decoding="async"></div>
        <div class="news-lead-body">
          <span class="news-kicker">{e(lead["section"])}</span>
          <h2>{html.escape(lead["h1"], quote=False)}</h2>
          <p>{html.escape(lead["description"], quote=False)}</p>
          <span class="news-card-meta">{e(lead.get("dateline") or "")}{" &middot; " if lead.get("dateline") else ""}{e(lead.get("published", ""))} &middot; {lead["read_min"]} min read</span>
        </div>
      </a>'''

    cards = "\n".join(
        f'''        <a class="news-card" href="/news/{e(s["slug"])}/">
          <div class="news-card-media"><img src="{e(site_relative(s.get("image")))}" alt="" width="1200" height="675" loading="lazy" decoding="async"></div>
          <div class="news-card-body">
            <span class="news-kicker">{e(s["section"])}</span>
            <h3>{html.escape(s["h1"], quote=False)}</h3>
            <p>{html.escape(s["description"][:150], quote=False)}…</p>
            <span class="news-card-meta">{e(s.get("published", ""))} &middot; {s["read_min"]} min read</span>
          </div>
        </a>''' for s in rest)

    grid = f'''      <div class="news-grid">
{cards}
      </div>''' if rest else ""

    empty = ("" if stories else
             '      <p class="news-empty">No stories filed yet.</p>')

    ld = {"@context": "https://schema.org", "@graph": [
        {
            "@type": "CollectionPage",
            "name": f"{APP_NAME} News",
            "url": f"{SITE_URL}/news/",
            "description": INDEX_BLURB,
            "inLanguage": "en",
            "isPartOf": {"@id": SITE_URL + "/#website"},
            "publisher": {"@id": ORG_ID},
            "hasPart": [
                {"@type": "NewsArticle", "headline": s["h1"],
                 "url": f"{SITE_URL}/news/{s['slug']}/",
                 "datePublished": s["published_iso"], "dateModified": updated_iso}
                for s in stories
            ],
        },
        ORGANIZATION_NODE,
    ]}

    return f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{GA_ID}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News | {APP_NAME}</title>
  <meta name="description" content="{e(INDEX_BLURB)}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{SITE_URL}/news/">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta property="og:type" content="website">
  <meta property="og:title" content="News | {APP_NAME}">
  <meta property="og:description" content="{e(INDEX_BLURB)}">
  <meta property="og:url" content="{SITE_URL}/news/">
  <meta property="og:image" content="{SITE_URL}/insnaps_og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="application/rss+xml" title="{APP_NAME} News" href="/news/feed.xml">
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/news.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{NAV}
  <main class="news-page">
    <header class="news-head">
      <span class="news-kicker">News desk</span>
      <h1>Reporting from InSnaps</h1>
      <p>{e(INDEX_BLURB)} Every story names its sources, and says plainly when we could not verify something.</p>
    </header>

{lead_html}
{grid}
{empty}

    <section class="news-note">
      <h2>How this desk works</h2>
      <p>These stories are written by the {APP_NAME} team, not aggregated from a feed. We report on companies, product launches and events, mostly in India and mostly in places the bigger outlets skip. Where a claim comes from a company's own marketing, we say so rather than repeating it as fact.</p>
      <p>Corrections and tips: <a href="/support/">get in touch</a>. If we get something wrong, tell us and we will fix it on the page.</p>
    </section>
  </main>

  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {datetime.now(timezone.utc).year} {APP_NAME} &middot; <a href="/">Home</a> &middot; <a href="/blog/">Blog</a> &middot; <a href="/answers/">Answers</a> &middot; <a href="/live/">Live</a> &middot; <a href="/news/feed.xml">RSS</a> &middot; <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{THEME_SCRIPT}
</body>
</html>
'''


def feed_xml(stories, now):
    def esc(t):
        return html.escape(str(t), quote=False)
    items = []
    for s in stories:
        try:
            dt = datetime.strptime(s["published_iso"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            dt = now
        items.append(
            "    <item>\n"
            f"      <title>{esc(s['h1'])}</title>\n"
            f"      <link>{SITE_URL}/news/{s['slug']}/</link>\n"
            f"      <guid isPermaLink=\"true\">{SITE_URL}/news/{s['slug']}/</guid>\n"
            f"      <category>{esc(s['section'])}</category>\n"
            f"      <description>{esc(s['description'])}</description>\n"
            f"      <pubDate>{dt.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>\n"
            "    </item>")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{APP_NAME} News</title>\n"
        f"    <link>{SITE_URL}/news/</link>\n"
        f"    <description>{esc(INDEX_BLURB)}</description>\n"
        "    <language>en</language>\n"
        f"    <lastBuildDate>{now.strftime('%a, %d %b %Y %H:%M:%S +0000')}</lastBuildDate>\n"
        f'    <atom:link href="{SITE_URL}/news/feed.xml" rel="self" type="application/rss+xml"/>\n'
        + "\n".join(items) + "\n  </channel>\n</rss>\n")


# ───────────────────────── main ─────────────────────────

def build_ld(meta, faqs, updated_iso):
    slug = meta["slug"]
    url = f"{SITE_URL}/news/{slug}/"

    article = {
        "@type": "NewsArticle",
        "headline": meta["h1"],
        "description": meta["description"],
        "image": meta["image"],
        "datePublished": meta["published_iso"],
        "dateModified": updated_iso,
        "articleSection": meta["section"],
        "inLanguage": "en",
        "isAccessibleForFree": True,
        # One publisher entity for the whole site, referenced by @id. Never
        # inline a second Organization — a crawler then resolves several
        # unrelated publishers instead of one.
        "publisher": {"@id": ORG_ID},
        "author": {"@id": ORG_ID},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "url": url,
    }
    if meta.get("dateline"):
        article["dateline"] = meta["dateline"]
    if meta.get("about_name"):
        about = {"@type": meta.get("about_type") or "Organization",
                 "name": meta["about_name"]}
        if meta.get("about_url"):
            about["url"] = meta["about_url"]
            # sameAs lets an engine tie the story to the entity it already knows
            # from the company's own site, instead of minting a new one.
            about["sameAs"] = [meta["about_url"]]
        article["about"] = about
    if meta.get("citations"):
        article["citation"] = meta["citations"]

    graph = [article, {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "News", "item": SITE_URL + "/news/"},
            {"@type": "ListItem", "position": 3, "name": meta["title"], "item": url},
        ],
    }]
    if faqs:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]})
    graph.append(ORGANIZATION_NODE)
    return {"@context": "https://schema.org", "@graph": graph}


def sync_homepage(stories, limit=3):
    """Fill the homepage's NEWS_LATEST block with the newest stories.

    index.html is hand-authored, so the alternative was a hardcoded card that
    goes stale the moment a second story lands. Same marker-replacement pattern
    build.sh already uses for CONFLICT_TOPICS in t/index.html.
    """
    path = os.path.join(ROOT, "index.html")
    if not os.path.isfile(path):
        return
    page = open(path, encoding="utf-8").read()
    # `.*?` swallows the newline before the closing marker, so the end tag is
    # re-emitted with its own indentation rather than captured.
    pattern = re.compile(
        r"(<!-- NEWS_LATEST:start -->\n).*?<!-- NEWS_LATEST:end -->", re.S)
    if not pattern.search(page):
        print("  ! NEWS_LATEST markers missing in index.html — homepage not updated",
              file=sys.stderr)
        return

    e = lambda v: html.escape(str(v), quote=True)
    cards = []
    for st in stories[:limit]:
        dateline = e(st.get("dateline") or "")
        sep = " &middot; " if st.get("dateline") else ""
        cards.append(
            '          <a class="hp-news-card" href="/news/%s/">\n'
            '            <span class="hp-news-kicker">%s</span>\n'
            '            <h3>%s</h3>\n'
            '            <p>%s\u2026</p>\n'
            '            <span class="hp-news-meta">%s%s%s</span>\n'
            '          </a>' % (
                e(st["slug"]), e(st["section"]),
                html.escape(st["h1"], quote=False),
                html.escape(st["description"][:130], quote=False),
                dateline, sep, e(st.get("published", ""))))
    cards = "\n".join(cards)

    updated = pattern.sub(
        lambda m: m.group(1) + cards + "\n          <!-- NEWS_LATEST:end -->", page)
    if updated != page:
        with open(path, "w", encoding="utf-8") as f:
            f.write(updated)
        print("  + homepage news block (%d cards)" % min(len(stories), limit))
    else:
        print("  homepage news block already in sync")


def main():
    now = datetime.now(timezone.utc)
    updated_iso = now.strftime("%Y-%m-%d")

    if not os.path.isdir(SRC_DIR):
        print(f"  no {os.path.relpath(SRC_DIR, ROOT)} — nothing to render")
        return 0
    files = sorted(f for f in os.listdir(SRC_DIR) if f.endswith(".md"))
    if not files:
        print("  no news markdown — nothing to render")
        return 0

    stories = []
    used = set()
    for name in files:
        raw = open(os.path.join(SRC_DIR, name), encoding="utf-8").read()
        front, body_md = parse_front_matter(raw)

        slug = front.get("slug") or re.sub(r"^news-", "", name[:-3])
        check_sources(body_md, slug)

        key = (front.get("section") or "companies").strip().lower()
        if key not in SECTIONS:
            raise ValueError(
                f"{slug}: section {key!r} is not one of {sorted(SECTIONS)}")
        section = SECTIONS[key]

        body_html, faqs, h1 = render_markdown(smart_quotes(body_md))
        h1 = front.get("title") or h1
        if not h1:
            print(f"    ! {name}: no title and no H1, skipped", file=sys.stderr)
            continue

        words = len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", body_html)))
        desc = front.get("summary") or first_paragraph_text(body_html)
        if len(desc) > 158:
            desc = desc[:155].rsplit(" ", 1)[0].rstrip(" ,;:—-") + "…"

        meta = {
            "slug": slug,
            "h1": h1,
            "title": seo_title(h1),
            "section": section,
            "dateline": front.get("dateline", ""),
            "description": desc,
            "read_min": max(1, round(words / WORDS_PER_MIN)),
            "words": words,
            "published": front.get("published", ""),
            "published_iso": iso_date(front.get("published"), updated_iso),
            "about_name": front.get("about_name", ""),
            "about_url": front.get("about_url", ""),
            "about_type": front.get("about_type", "Organization"),
            "citations": [u for u in as_list(front.get("source")) if u.startswith("http")],
            "image": make_cover(slug, section, used),
        }

        out_dir = os.path.join(OUT_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(article_page(meta, body_html, build_ld(meta, faqs, updated_iso), updated_iso))

        print(f"  + /news/{slug}/  ({section}, {meta['words']}w, "
              f"{meta['read_min']} min, {len(meta['citations'])} cited sources)")
        stories.append(meta)

    # A renamed or withdrawn story must not leave an orphan page live and in the
    # sitemap. "assets" holds the generated covers, not a story.
    keep = {s["slug"] for s in stories} | {"assets"}
    for name in sorted(os.listdir(OUT_DIR)):
        d = os.path.join(OUT_DIR, name)
        if os.path.isdir(d) and name not in keep:
            shutil.rmtree(d)
            print(f"  - pruned /news/{name}/ (no source markdown)")

    stories.sort(key=lambda s: s["published_iso"], reverse=True)

    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_page(stories, updated_iso))
    print(f"  + /news/ index ({len(stories)} stories)")

    with open(os.path.join(OUT_DIR, "feed.xml"), "w", encoding="utf-8") as f:
        f.write(feed_xml(stories, now))
    print("  + /news/feed.xml")

    sync_homepage(stories)

    with open(os.path.join(ROOT, "_data", "news.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": now.isoformat(), "stories": stories}, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
