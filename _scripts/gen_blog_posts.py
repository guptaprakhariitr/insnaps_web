#!/usr/bin/env python3
"""Render the long-form buzz blog posts into /blog/<slug>/ pages.

The editorial posts live in the buzz repo as `content/insnaps/blog-*.md`, in the
house format:

    # Question-shaped H1
    _Published 1 August 2026 · Updated 1 August 2026_
    **The short answer:** …
    ## sections, a table, ## What it won't do
    ## FAQ
    ## Sources
    ## Structured Data (JSON-LD)   <- used as the page's ld+json, not printed
    ## Image Prompts               <- production notes, never published

Two sections are deliberately consumed rather than rendered: the JSON-LD block
becomes the page's real structured data, and Image Prompts are internal art
direction that must not reach a reader.

buzz is a separate repo and is NOT checked out in CI, so the markdown is
vendored into `_content/blog/` (committed) and rendered from there — same
arrangement as gen_answers.py. Override the source with BUZZ_CONTENT_DIR.

Run from repo root:  python3 _scripts/gen_blog_posts.py
"""
import html
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_answers import render_markdown, NAV, THEME_SCRIPT, qa_list_html  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VENDOR_DIR = os.path.join(ROOT, "_content", "blog")
OUT_DIR = os.path.join(ROOT, "blog")
SITE_URL = "https://insnaps.app"
APP_NAME = "InSnaps"
GA_ID = "G-HQQCZ7SLN5"
PLAY_STORE = "https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree"
APP_STORE = "https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049"

DEFAULT_BUZZ = os.path.join(ROOT, "..", "buzz", "content", "insnaps")
BUZZ_DIR = os.environ.get("BUZZ_CONTENT_DIR", DEFAULT_BUZZ)

WORDS_PER_MIN = 220

# Owned by generate_blog.py (the live RSS roundups); never pruned by this script.
RSS_ROUNDUP_SLUGS = {
    "global-conflicts", "ukraine-russia-war", "middle-east-conflict",
    "geopolitics-sanctions", "africa-conflicts", "military-defense-news",
}


# ───────────────────────── parsing ─────────────────────────

def split_sections(md):
    """Pull out the JSON-LD and Image Prompt blocks; return (body, ld, meta)."""
    ld = None
    # ## Structured Data (JSON-LD) … ```json … ```
    m = re.search(r"##\s*Structured Data.*?```json\s*(.*?)```", md, re.S | re.I)
    if m:
        try:
            ld = json.loads(m.group(1))
        except Exception as e:
            print(f"    ! JSON-LD did not parse ({e}) — falling back to generated", file=sys.stderr)

    # Drop everything from the Structured Data heading onwards (that also removes
    # Image Prompts, which always follows it).
    cut = re.search(r"\n##\s*Structured Data", md, re.I)
    if cut:
        md = md[: cut.start()]
    # Belt and braces if the order ever changes.
    cut = re.search(r"\n##\s*Image Prompts", md, re.I)
    if cut:
        md = md[: cut.start()]

    meta = {}
    m = re.search(r"^_Published\s+(.+?)(?:\s*·\s*Updated\s+(.+?))?_\s*$", md, re.M)
    if m:
        meta["published"] = m.group(1).strip()
        meta["updated"] = (m.group(2) or m.group(1)).strip()
        md = md[: m.start()] + md[m.end():]

    return md.strip(), ld, meta


def iso_date(text, fallback):
    """'1 August 2026' -> '2026-08-01'."""
    if not text:
        return fallback
    for fmt in ("%d %B %Y", "%d %b %Y", "%B %d, %Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return fallback


def extract_faqs(md):
    """`**Question?** answer` pairs from the FAQ section.

    The house format writes FAQs as bolded inline questions, not headings, so
    the shared heading-based extractor in gen_answers.py does not see them.
    Only used when the author did not supply a FAQPage of their own.
    """
    m = re.search(r"\n##\s*FAQ\s*\n(.*?)(?=\n##\s|\Z)", md, re.S | re.I)
    if not m:
        return []
    out = []
    for qm in re.finditer(r"\*\*(.+?)\*\*\s*(.+?)(?=\n\s*\n|\Z)", m.group(1), re.S):
        q = re.sub(r"\s+", " ", qm.group(1)).strip()
        a = re.sub(r"\s+", " ", re.sub(r"[*_`]", "", qm.group(2))).strip()
        if q.endswith("?") and len(a) > 30:
            out.append((q, a))
    return out


_CODE_SPAN = re.compile(r"```.*?```|`[^`\n]*`", re.S)
_OPEN_DQ = re.compile(r'(^|[\s([{<\u2013\u2014-])"', re.M)
_OPEN_SQ = re.compile(r"(^|[\s([{<\u2013\u2014])'", re.M)


def smart_quotes(md):
    """Straight quotes to typographic ones.

    Space Grotesk draws `"` as a slanted mark that reads as a *closing* quote, so
    a 50px headline like "Local News" rendered as two closing quotes. Code spans
    and fenced blocks are protected — a quote inside them is literal.
    """
    parts = []

    def stash(m):
        parts.append(m.group(0))
        return "\x00%d\x00" % (len(parts) - 1)

    out = _CODE_SPAN.sub(stash, md)
    out = _OPEN_DQ.sub(lambda m: m.group(1) + "\u201c", out)
    out = out.replace('"', "\u201d")
    out = _OPEN_SQ.sub(lambda m: m.group(1) + "\u2018", out)
    # Apostrophe and closing single quote are the same glyph.
    out = out.replace("'", "\u2019")
    return re.sub(r"\x00(\d+)\x00", lambda m: parts[int(m.group(1))], out)


def first_paragraph_text(body_html):
    m = re.search(r"<p[^>]*>(.*?)</p>", body_html, re.S)
    if not m:
        return ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()


# One publisher entity for the whole site. index.html declares the same @id, so
# a crawler that reads both pages resolves a single organization.
ORG_ID = SITE_URL + "/#organization"
ORGANIZATION_NODE = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "InSnaps",
    "alternateName": APP_NAME,
    "url": SITE_URL,
    # Dimensions on publisher.logo: Google treats the logo as an ImageObject and
    # a bare url leaves it guessing whether the asset is usable.
    "logo": {"@type": "ImageObject", "url": SITE_URL + "/logo.png",
             "width": 480, "height": 480},
    "sameAs": [
        "https://x.com/BuildWtPrakhar",
        "https://www.instagram.com/insnapsofficial",
        "https://www.threads.net/@insnapsofficial",
        "https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049",
        "https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree",
    ],
}


def local_path_for(url):
    """Map a site-absolute image URL back to a file on disk, or None."""
    if not url:
        return None
    if url.startswith(SITE_URL):
        rel = url[len(SITE_URL):]
    elif url.startswith("/"):
        rel = url
    else:
        return None
    return os.path.join(ROOT, rel.lstrip("/"))


COVER_DIR = os.path.join(OUT_DIR, "assets")


# Accent hues that sit next to the InSnaps orange rather than fighting it. A
# free-running hash produced saturated reds and greens that looked nothing like
# the brand, so the palette is a fixed list and the hash only picks from it.
COVER_ACCENTS = [
    (18, 82, 56),    # brand orange
    (188, 58, 48),   # teal
    (232, 52, 58),   # indigo
    (40, 78, 54),    # amber
    (348, 56, 56),   # rose
    (208, 46, 50),   # steel blue
]


def make_cover(slug, taken=None):
    """Draw a cover for a post that ships without a photograph.

    The authors write image *prompts*, not images, so the declared hero is never
    a file we have. Two earlier attempts were worse than none: the app's
    breaking-news templates have "LIVE" burnt into them and the 16:9 crop sliced
    the badge, and a hash-picked hue with a soft circle just looked arbitrary.

    This is a flat editorial mark — deep ink, a fine rule field, and concentric
    arcs anchored off-canvas. No text, so nothing to translate or misread, and
    the accent is chosen from a fixed brand-adjacent palette.
    """
    h = 0
    for ch in slug:
        h = (h * 31 + ord(ch)) & 0x7FFFFFFF

    n = h % len(COVER_ACCENTS)
    if taken is not None:                       # keep two cards from matching
        for _ in range(len(COVER_ACCENTS)):
            if n not in taken:
                break
            n = (n + 1) % len(COVER_ACCENTS)
        taken.add(n)
    hue, sat, lum = COVER_ACCENTS[n]
    accent = f"hsl({hue} {sat}% {lum}%)"

    corner = (h >> 6) % 2                       # arcs from the right or the left
    cx, cy = (1200, 675) if corner else (0, 675)
    rules = "".join(
        f'<line x1="{x}" y1="0" x2="{x - 220}" y2="675" stroke-width="1"/>'
        for x in range(-120, 1560, 58))
    arcs = "".join(
        f'<circle cx="{cx}" cy="{cy}" r="{r}" stroke="{accent}" '
        f'stroke-opacity="{0.42 - i * 0.06:.2f}" stroke-width="{2.5 - i * 0.25:.2f}"/>'
        for i, r in enumerate(range(300, 300 + 5 * 118, 118)))

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img">
  <defs>
    <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141b26"/>
      <stop offset="1" stop-color="#0a0e15"/>
    </linearGradient>
    <radialGradient id="glow" cx="{"100%" if corner else "0%"}" cy="100%" r="95%">
      <stop offset="0" stop-color="{accent}" stop-opacity=".30"/>
      <stop offset="1" stop-color="{accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#ink)"/>
  <g stroke="#ffffff" stroke-opacity=".045">{rules}</g>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <g fill="none">{arcs}</g>
  <rect x="0" y="667" width="1200" height="8" fill="{accent}" fill-opacity=".9"/>
</svg>
'''
    os.makedirs(COVER_DIR, exist_ok=True)
    with open(os.path.join(COVER_DIR, f"{slug}-cover.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    return f"{SITE_URL}/blog/assets/{slug}-cover.svg"


def seo_title(h1):
    """A <title> that fits Google's ~60-70 char display without ending mid-phrase.

    These headlines are two-part ("Question? Qualifier" / "Claim: detail"), so the
    first clause is almost always the standalone title. Falling back to a hard
    slice left titles ending in "and"."""
    h1 = h1.strip()
    if len(h1) <= 70:
        return h1
    for sep in ("? ", ": ", " — ", ". "):
        head = h1.split(sep)[0] + sep.strip()
        if 25 <= len(head) <= 70:
            return head
    return h1[:67].rsplit(" ", 1)[0] + "…"


def hero_image(ld, slug, taken=None):
    """Prefer the image the author declared in the JSON-LD."""
    if isinstance(ld, dict):
        graph = ld.get("@graph") or [ld]
        for node in graph:
            if isinstance(node, dict) and node.get("@type") == "Article" and node.get("image"):
                img = node["image"]
                if isinstance(img, list):
                    img = img[0] if img else None
                if isinstance(img, dict):
                    img = img.get("url")
                if img:
                    # Only trust it if the file is actually there.
                    lp = local_path_for(img)
                    if lp is None or os.path.isfile(lp):
                        return img
                    print(f"    ! declared hero image missing ({img}) — drawing a cover",
                          file=sys.stderr)
    return make_cover(slug, taken)


# ───────────────────────── page ─────────────────────────

def site_relative(url):
    """<img src> must be root-relative so a local preview loads the file being
    built rather than silently falling back to whatever production still has.
    OG tags and JSON-LD keep the absolute form — those need to resolve off-site."""
    return url[len(SITE_URL):] if isinstance(url, str) and url.startswith(SITE_URL) else url


def page_html(meta, body_html, ld_json, updated_iso):
    e = lambda s: html.escape(str(s), quote=True)
    slug = meta["slug"]
    url = f"{SITE_URL}/blog/{slug}/"
    img = meta.get("image") or f"{SITE_URL}/insnaps_og.png"

    return f"""<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{GA_ID}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(meta['title'])} | {APP_NAME}</title>
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
  <meta property="article:published_time" content="{meta['published_iso']}">
  <meta property="article:modified_time" content="{updated_iso}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{e(meta['title'])}">
  <meta name="twitter:description" content="{e(meta['description'])}">
  <meta name="twitter:image" content="{e(img)}">
  <script type="application/ld+json">{json.dumps(ld_json, ensure_ascii=False)}</script>
  <link rel="alternate" type="application/rss+xml" title="{APP_NAME} blog" href="/blog/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/blogpost.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{NAV}
  <div class="post-progress" aria-hidden="true"><i id="postProgress"></i></div>
  <main class="post-page">
    <header class="post-head">
      <nav class="post-crumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span aria-hidden="true">›</span> <a href="/blog/">Blog</a>
      </nav>
      <h1>{html.escape(meta['h1'], quote=False)}</h1>
      <p class="post-meta">{e(meta.get('published', ''))} · {meta['read_min']} min read</p>
    </header>
    <figure class="post-hero">
      <img src="{e(site_relative(img))}" alt="" width="1200" height="675" fetchpriority="high" decoding="async">
    </figure>
    <p class="post-back"><a href="/blog/">← Back to Blog</a></p>
    <article class="ans-article post-body">
      {body_html}
      <aside class="ans-cta">
        <h2>See it on your own city</h2>
        <p>Type any place on the homepage and the feed fills in — then get the app for the parts the web cannot do.</p>
        <div class="ans-cta-row">
          <a class="btn-primary" href="/">Try it</a>
          <a class="btn-secondary" href="{APP_STORE}" target="_blank" rel="noopener">App Store</a>
          <a class="btn-secondary" href="{PLAY_STORE}" target="_blank" rel="noopener">Google Play</a>
        </div>
      </aside>
    </article>
  </main>
  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {datetime.now(timezone.utc).year} {APP_NAME} · <a href="/">Home</a> · <a href="/blog/">Blog</a> · <a href="/answers/">Answers</a> · <a href="/live/">Live</a> · <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{THEME_SCRIPT}
  <script>
    // Reading progress. Measured against the article body, not the document, so
    // the bar reaches 100% when the reader finishes the text rather than when
    // they reach the bottom of the CTA and footer.
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
      label: 'Get InSnaps', sub: 'Your town and the world, in one feed'
    }});
  </script>
</body>
</html>
"""



# ───────────────────────── index + feed ─────────────────────────

ROUNDUP_TITLES = {
    "global-conflicts": "Global Conflicts & Wars",
    "ukraine-russia-war": "Ukraine–Russia War",
    "middle-east-conflict": "Middle East Conflict",
    "geopolitics-sanctions": "Geopolitics & Sanctions",
    "africa-conflicts": "Africa Conflicts",
    "military-defense-news": "Military & Defense",
}


def load_answers():
    """The Q&A pages, written by gen_answers.py earlier in the same build."""
    try:
        with open(os.path.join(ROOT, "_data", "answers.json"), encoding="utf-8") as f:
            return json.load(f).get("pages") or []
    except Exception:
        return []


def index_html(posts, updated_iso):
    e = lambda s: html.escape(str(s), quote=True)
    answers = load_answers()

    cards = "\n".join(
        f'''        <a class="blogx-card" href="/blog/{e(p["slug"])}/">
          <div class="blogx-card-media"><img src="{e(site_relative(p.get("image") or SITE_URL + "/insnaps_og.png"))}" alt="" loading="lazy" decoding="async"></div>
          <div class="blogx-card-body">
            <span class="blogx-card-meta">{e(p.get("published", ""))} &middot; {p["read_min"]} min read</span>
            <h2>{html.escape(p["h1"], quote=False)}</h2>
            <p>{html.escape(p["description"][:150], quote=False)}…</p>
            <span class="blogx-card-more">Read more &rarr;</span>
          </div>
        </a>''' for p in posts)

    roundups = "\n".join(
        f'''          <a class="blogx-round" href="/blog/{e(slug)}/">{e(title)}</a>'''
        for slug, title in ROUNDUP_TITLES.items()
        if os.path.isdir(os.path.join(OUT_DIR, slug)))

    blog_node = {
        "@type": "Blog",
        "name": f"{APP_NAME} Blog",
        "url": f"{SITE_URL}/blog/",
        "description": "Guides and straight answers on how local and world news actually reach you: coverage, personalisation, formats and the honest limits.",
        "publisher": {"@id": ORG_ID},
        "inLanguage": "en",
        "blogPost": [
            {"@type": "BlogPosting", "headline": p["h1"],
             "url": f"{SITE_URL}/blog/{p['slug']}/",
             "datePublished": p["published_iso"], "dateModified": updated_iso}
            for p in posts
        ],
    }
    # Carry the publisher entity on this page too, so the @id above resolves for
    # a crawler that only ever reads /blog/.
    ld = {"@context": "https://schema.org", "@graph": [blog_node, ORGANIZATION_NODE]}

    answers_html = qa_list_html(answers, heading_level=3)

    return f'''<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{GA_ID}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reading | {APP_NAME}</title>
  <meta name="description" content="Guides and straight answers on how local and world news reaches you — what counts as local coverage, news deserts, choosing your mix, listening instead of reading, and telling real personalisation from popularity.">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{SITE_URL}/blog/">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Reading | {APP_NAME}">
  <meta property="og:description" content="How local and world news actually reaches you.">
  <meta property="og:url" content="{SITE_URL}/blog/">
  <meta property="og:image" content="{SITE_URL}/insnaps_og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="application/rss+xml" title="{APP_NAME} blog" href="/blog/feed.xml">
  <script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/blogx.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{NAV}
  <main class="blogx-page">
    <header class="blogx-head">
      <span class="blogx-kicker">Reading</span>
      <h1>How the news actually reaches you</h1>
      <p>Guides, straight answers and live roundups in one place — coverage, personalisation, formats and the honest limits.</p>
    </header>

    <section class="blogx-guides">
      <div class="blogx-sec-head">
        <span class="qa-kicker">Guides</span>
        <h2>The longer write-ups</h2>
        <p>Written to be useful whether or not you ever install anything.</p>
      </div>
      <div class="blogx-grid">
{cards}
      </div>
    </section>

    <section class="blogx-answers" id="answers">
      <div class="blogx-sec-head">
        <span class="qa-kicker">Answers</span>
        <h2>Short questions, straight answers</h2>
        <p>The things people actually type into a search box, each one sourced and honest about the limits.</p>
      </div>
      <div class="qa-list">
{answers_html}
      </div>
    </section>

    <section class="blogx-rounds">
      <div class="blogx-sec-head">
        <span class="qa-kicker">Live</span>
        <h2>Roundups, refreshed through the day</h2>
        <p>Continuously updated headline collections, built from the feed rather than written.</p>
      </div>
      <div class="blogx-round-row">
{roundups}
      </div>
    </section>
  </main>

  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {datetime.now(timezone.utc).year} {APP_NAME} &middot; <a href="/">Home</a> &middot; <a href="/answers/">Answers</a> &middot; <a href="/live/">Live</a> &middot; <a href="/blog/feed.xml">RSS</a> &middot; <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{THEME_SCRIPT}
</body>
</html>
'''


def feed_xml(posts, now):
    def esc(t):
        return html.escape(str(t), quote=False)
    items = []
    for p in posts:
        try:
            dt = datetime.strptime(p["published_iso"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            dt = now
        items.append(
            "    <item>\n"
            f"      <title>{esc(p['h1'])}</title>\n"
            f"      <link>{SITE_URL}/blog/{p['slug']}/</link>\n"
            f"      <guid isPermaLink=\"true\">{SITE_URL}/blog/{p['slug']}/</guid>\n"
            f"      <description>{esc(p['description'])}</description>\n"
            f"      <pubDate>{dt.strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>\n"
            "    </item>")
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{APP_NAME} Blog</title>\n"
        f"    <link>{SITE_URL}/blog/</link>\n"
        "    <description>How local and world news actually reaches you.</description>\n"
        "    <language>en</language>\n"
        f"    <lastBuildDate>{now.strftime('%a, %d %b %Y %H:%M:%S +0000')}</lastBuildDate>\n"
        f'    <atom:link href="{SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>\n'
        + "\n".join(items) + "\n  </channel>\n</rss>\n")

# ───────────────────────── main ─────────────────────────

def sync_from_buzz():
    src = os.path.abspath(BUZZ_DIR)
    if not os.path.isdir(src):
        print(f"  buzz not found at {src} — rendering vendored copies only")
        return 0
    os.makedirs(VENDOR_DIR, exist_ok=True)
    n = 0
    for name in sorted(os.listdir(src)):
        if not (name.startswith("blog-") and name.endswith(".md")):
            continue
        s, d = os.path.join(src, name), os.path.join(VENDOR_DIR, name)
        if not os.path.exists(d) or open(s).read() != open(d).read():
            shutil.copyfile(s, d)
            n += 1
    print(f"  synced {n} post(s) from buzz")
    return n


def main():
    now = datetime.now(timezone.utc)
    updated_iso = now.strftime("%Y-%m-%d")
    sync_from_buzz()

    if not os.path.isdir(VENDOR_DIR):
        print("  no _content/blog — nothing to render")
        return 0
    files = sorted(f for f in os.listdir(VENDOR_DIR) if f.endswith(".md"))
    if not files:
        print("  no blog markdown — nothing to render")
        return 0

    posts = []
    used_templates = set()
    for name in files:
        raw = open(os.path.join(VENDOR_DIR, name), encoding="utf-8").read()
        body_md, ld, front = split_sections(raw)
        # Typographic quotes only on the prose. The authored JSON-LD is already
        # split off above and keeps its literal quotes.
        body_html, faqs, h1 = render_markdown(smart_quotes(body_md))
        if not h1:
            print(f"    ! {name}: no H1, skipped", file=sys.stderr)
            continue

        slug = re.sub(r"^blog-", "", name[:-3])
        words = len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", body_html)))
        read_min = max(1, round(words / WORDS_PER_MIN))
        # Google renders roughly 155 chars; a hard 300-char slice both
        # overflowed and cut mid-word.
        desc = first_paragraph_text(body_html)
        if len(desc) > 158:
            desc = desc[:155].rsplit(" ", 1)[0].rstrip(" ,;:—-") + "…"
        pub_iso = iso_date(front.get("published"), updated_iso)

        meta = {
            "slug": slug, "h1": h1, "title": seo_title(h1),
            "description": desc[:200], "read_min": read_min,
            "published": front.get("published", ""), "published_iso": pub_iso,
            "image": hero_image(ld, slug, used_templates), "words": words,
        }

        if not ld:
            ld = {"@context": "https://schema.org", "@graph": []}
        # An empty @graph must not fall back to wrapping the container itself —
        # that pushed a typeless {"@context":…} node into the output.
        if isinstance(ld, dict) and "@graph" in ld:
            graph = list(ld["@graph"] or [])
        elif isinstance(ld, list):
            graph = list(ld)
        else:
            graph = [ld]
        graph = [n for n in graph if isinstance(n, dict) and n.get("@type")]

        # Synthesize the Article/FAQPage the author did not write, so a post is
        # never published without structured data.
        have = {n.get("@type") for n in graph if isinstance(n, dict)}
        if "Article" not in have:
            graph.append({
                "@type": "Article", "headline": h1, "description": meta["description"],
                "image": meta["image"] or f"{SITE_URL}/insnaps_og.png",
                "datePublished": pub_iso, "dateModified": updated_iso,
                "author": {"@id": ORG_ID},
                "publisher": {"@id": ORG_ID},
                "mainEntityOfPage": {"@type": "WebPage", "@id": f"{SITE_URL}/blog/{slug}/"},
                "isAccessibleForFree": True,
            })
            print(f"    (generated Article schema for {slug})")
        if "FAQPage" not in have:
            pairs = faqs or extract_faqs(body_md)
            if pairs:
                graph.append({"@type": "FAQPage", "mainEntity": [
                    {"@type": "Question", "name": q,
                     "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]})
                print(f"    (generated FAQPage with {len(pairs)} entries for {slug})")
        # Always add a breadcrumb; authors do not write one.
        graph = list(graph) + [{
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"},
                {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE_URL + "/blog/"},
                {"@type": "ListItem", "position": 3, "name": meta["title"],
                 "item": f"{SITE_URL}/blog/{slug}/"},
            ],
        }]
        # Normalize whatever the author wrote onto the site's one publisher
        # entity. Left alone, each post declared its own inline Organization
        # under a slightly different name, so answer engines saw a handful of
        # unrelated publishers instead of one.
        for node in graph:
            if node.get("@type") not in ("Article", "BlogPosting", "NewsArticle"):
                continue
            node["publisher"] = {"@id": ORG_ID}
            if not isinstance(node.get("author"), dict) or \
                    node["author"].get("@type") != "Person":
                node["author"] = {"@id": ORG_ID}
            node.setdefault("inLanguage", "en")
            node.setdefault("isAccessibleForFree", True)
            node.setdefault("mainEntityOfPage",
                            {"@type": "WebPage", "@id": f"{SITE_URL}/blog/{slug}/"})
            # The authors declare a hero from their image prompts, which is not
            # a file we ship — advertising a 404 in schema is worse than none.
            declared = node.get("image")
            first = declared[0] if isinstance(declared, list) and declared else declared
            if isinstance(first, dict):
                first = first.get("url")
            lp = local_path_for(first) if isinstance(first, str) else None
            if not isinstance(first, str) or (lp is not None and not os.path.isfile(lp)):
                node["image"] = meta["image"]

        graph = list(graph) + [ORGANIZATION_NODE]
        ld_out = {"@context": "https://schema.org", "@graph": graph}

        out_dir = os.path.join(OUT_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(page_html(meta, body_html, ld_out, updated_iso))

        types = sorted({str(n.get("@type")) for n in graph if isinstance(n, dict)})
        print(f"  + /blog/{slug}/  ({words}w, {read_min} min, {len(faqs)} FAQ, schema: {', '.join(types)})")
        posts.append(meta)

    # Prune pages whose source markdown is gone, so a deleted or renamed post
    # does not leave an orphan page live (and in the sitemap) forever. The
    # RSS roundup directories are owned by generate_blog.py, so leave them be.
    # "assets" holds the generated covers, not a post — pruning it deleted every
    # cover immediately after drawing it.
    keep = {p["slug"] for p in posts} | set(RSS_ROUNDUP_SLUGS) | {"assets"}
    for name in sorted(os.listdir(OUT_DIR)):
        d = os.path.join(OUT_DIR, name)
        if not os.path.isdir(d) or name in keep:
            continue
        shutil.rmtree(d)
        print(f"  - pruned /blog/{name}/ (no source markdown)")

    posts.sort(key=lambda p: p["published_iso"], reverse=True)

    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html(posts, updated_iso))
    print(f"  + /blog/ index ({len(posts)} posts)")

    with open(os.path.join(OUT_DIR, "feed.xml"), "w", encoding="utf-8") as f:
        f.write(feed_xml(posts, now))
    print("  + /blog/feed.xml")

    with open(os.path.join(ROOT, "_data", "blog-posts.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": now.isoformat(), "posts": posts}, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
