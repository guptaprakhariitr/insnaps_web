#!/usr/bin/env python3
"""Render the buzz GEO content into /answers/ pages on insnaps.app.

These pages exist to be *cited* by AI answer engines (ChatGPT, Perplexity,
Gemini, Google AI Overviews), which is a different job from ranking a blog post:
each page answers one question directly, in the first paragraph, and ships
FAQPage + Article JSON-LD so the question/answer pairs are machine-readable.

Source of truth lives in the buzz repo (`content/insnaps/answer-*.md`). buzz is a
separate repo and is NOT checked out in CI, so this script has two modes:

  * locally  — syncs `answer-*.md` from buzz into `_content/answers/`, then renders
  * in CI    — buzz is absent, so it renders whatever is already vendored in
               `_content/answers/` (which is committed)

Override the buzz location with BUZZ_CONTENT_DIR.

Run from repo root:  python3 _scripts/gen_answers.py
"""
import html
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VENDOR_DIR = os.path.join(ROOT, "_content", "answers")
OUT_DIR = os.path.join(ROOT, "answers")
SITE_URL = "https://insnaps.app"
APP_NAME = "InSnaps"
GA_ID = "G-HQQCZ7SLN5"
PLAY_STORE = "https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree"
APP_STORE = "https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049"

DEFAULT_BUZZ = os.path.join(ROOT, "..", "buzz", "content", "insnaps")
BUZZ_DIR = os.environ.get("BUZZ_CONTENT_DIR", DEFAULT_BUZZ)


# ───────────────────────── frontmatter ─────────────────────────

def parse_frontmatter(text):
    """Minimal YAML frontmatter: flat `key: value` pairs only."""
    meta = {}
    body = text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            raw = text[3:end]
            body = text[end + 4:]
            for line in raw.split("\n"):
                line = line.strip()
                if not line or line.startswith("#") or ":" not in line:
                    continue
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip().strip('"').strip("'")
    return meta, body.lstrip("\n")


# ───────────────────────── markdown subset ─────────────────────────
# Deliberately small: only what the answer pages actually use. No dependency,
# because CI installs nothing beyond Pillow.

def inline(text):
    """Inline markdown -> HTML. Escapes first, so content can never inject."""
    out = html.escape(text, quote=False)
    # Code spans before anything else, so their contents stay literal.
    codes = []

    def stash_code(m):
        codes.append(m.group(1))
        return "\x00CODE%d\x00" % (len(codes) - 1)

    out = re.sub(r"`([^`]+)`", stash_code, out)
    # [label](url) — only http(s), mailto and site-relative targets.
    def link(m):
        label, url = m.group(1), m.group(2).strip()
        if not re.match(r"^(https?://|mailto:|/)", url):
            return label
        ext = url.startswith("http") and "insnaps.app" not in url
        rel = ' target="_blank" rel="noopener"' if ext else ""
        return '<a href="%s"%s>%s</a>' % (html.escape(url, quote=True), rel, label)

    out = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<![*\w])\*([^*]+)\*(?!\*)", r"<em>\1</em>", out)
    for i, c in enumerate(codes):
        out = out.replace("\x00CODE%d\x00" % i, "<code>%s</code>" % c)
    return out


def slugify(text):
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:80]


def render_markdown(md):
    """Returns (html, faqs, h1). faqs = [(question, answer_text)]."""
    lines = md.split("\n")
    out = []
    faqs = []
    h1 = None
    i = 0
    in_faq = False
    pending_q = None
    pending_a = []
    first_para_done = False

    def flush_faq():
        nonlocal pending_q, pending_a
        if pending_q:
            ans = " ".join(pending_a).strip()
            if ans:
                faqs.append((pending_q, ans))
        pending_q, pending_a = None, []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # tables
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            header = [c.strip() for c in stripped.strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            t = ['<div class="ans-table-wrap"><table>', "<thead><tr>"]
            t += ["<th>%s</th>" % inline(c) for c in header]
            t.append("</tr></thead><tbody>")
            for r in rows:
                t.append("<tr>" + "".join("<td>%s</td>" % inline(c) for c in r) + "</tr>")
            t.append("</tbody></table></div>")
            out.append("".join(t))
            continue

        # headings
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            flush_faq()
            level, txt = len(m.group(1)), m.group(2).strip()
            if level == 1 and h1 is None:
                h1 = txt
                i += 1
                continue
            if level == 2:
                in_faq = bool(re.match(r"^(faq|frequently asked)", txt, re.I))
            if level == 3 and in_faq:
                pending_q = re.sub(r"<[^>]+>", "", inline(txt))
            anchor = slugify(txt)
            out.append('<h%d id="%s">%s</h%d>' % (level, anchor, inline(txt), level))
            i += 1
            continue

        # lists
        if re.match(r"^([-*+]|\d+\.)\s+", stripped):
            ordered = bool(re.match(r"^\d+\.", stripped))
            tag = "ol" if ordered else "ul"
            items = []
            while i < len(lines) and re.match(r"^([-*+]|\d+\.)\s+", lines[i].strip()):
                items.append(re.sub(r"^([-*+]|\d+\.)\s+", "", lines[i].strip()))
                i += 1
            out.append("<%s>%s</%s>" % (tag, "".join("<li>%s</li>" % inline(x) for x in items), tag))
            continue

        # blockquote
        if stripped.startswith(">"):
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append("<blockquote>%s</blockquote>" % inline(" ".join(quote)))
            continue

        # horizontal rule
        if re.match(r"^(\*{3,}|-{3,}|_{3,})$", stripped):
            i += 1
            continue

        # paragraph
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(
                r"^(#{1,4}\s|[-*+]\s|\d+\.\s|>|\|)", lines[i].strip()):
            para.append(lines[i].strip())
            i += 1
        text = " ".join(para)
        if pending_q:
            pending_a.append(re.sub(r"<[^>]+>", "", inline(text)))
        cls = ""
        if not first_para_done:
            # The opening paragraph is the answer an engine lifts; mark it up so
            # it reads as the answer and is easy to target.
            cls = ' class="ans-lead"'
            first_para_done = True
        out.append("<p%s>%s</p>" % (cls, inline(text)))

    flush_faq()
    return "\n".join(out), faqs, h1


# ───────────────────────── page template ─────────────────────────

NAV = """  <nav class="navbar scrolled" id="navbar">
    <div class="nav-container">
      <a href="/" class="nav-logo">
        <img src="/logo.png" alt="{app}" class="nav-logo-icon" width="32" height="32">
        <span class="nav-logo-text">InSnaps</span>
      </a>
      <div class="nav-links" id="navLinks">
        <a href="/#blend">How it works</a>
        <a href="/live/">Live</a>
        <a href="/answers/">Answers</a>
        <a href="/blog/">Blog</a>

        <a href="{play}" target="_blank" rel="noopener" class="nav-cta">Download Free</a>
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
""".format(app=APP_NAME, play=PLAY_STORE)

THEME_SCRIPT = """  <script>
    (function () {
      var html = document.documentElement, t = document.getElementById('themeToggle');
      var s = localStorage.getItem('insnaps-theme');
      html.setAttribute('data-theme', (s === 'light' || s === 'dark') ? s : 'light');
      if (t) t.addEventListener('click', function () {
        var n = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', n);
        localStorage.setItem('insnaps-theme', n);
      });
      var h = document.getElementById('navHamburger'), nl = document.getElementById('navLinks');
      if (h && nl) h.addEventListener('click', function () {
        h.classList.toggle('open'); nl.classList.toggle('open');
        document.body.style.overflow = nl.classList.contains('open') ? 'hidden' : '';
      });
    })();
  </script>
"""


def page_html(meta, body_html, faqs, h1, updated):
    slug = meta["slug"]
    title = meta.get("title") or h1 or slug
    desc = meta.get("description", "")
    url = "%s/answers/%s/" % (SITE_URL, slug)

    ld = [{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": h1 or title,
        "description": desc,
        "url": url,
        "datePublished": meta.get("date", updated[:10]),
        "dateModified": updated[:10],
        "author": {"@type": "Organization", "name": APP_NAME, "url": SITE_URL},
        "publisher": {"@type": "Organization", "name": APP_NAME, "url": SITE_URL,
                      "logo": {"@type": "ImageObject", "url": SITE_URL + "/logo.png"}},
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "isAccessibleForFree": True,
    }]
    # FAQPage is the part answer engines actually consume.
    if faqs:
        ld.append({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q,
                 "acceptedAnswer": {"@type": "Answer", "text": a}}
                for q, a in faqs
            ],
        })
    ld.append({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Answers", "item": SITE_URL + "/answers/"},
            {"@type": "ListItem", "position": 3, "name": title, "item": url},
        ],
    })

    e = lambda s: html.escape(str(s), quote=True)
    return """<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{ga}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | {app}</title>
  <meta name="description" content="{desc}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <link rel="canonical" href="{url}">
  <link rel="icon" type="image/png" href="/logo.png">
  <meta name="google-play-app" content="app-id=com.prakshaappthree.appthree">
  <meta name="apple-itunes-app" content="app-id=6762338049">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{site}/insnaps_og.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{site}/insnaps_og.png">
  <script type="application/ld+json">{ld}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{nav}
  <main class="ans-page">
    <article class="ans-article">
      <nav class="ans-crumb" aria-label="Breadcrumb">
        <a href="/">Home</a> <span aria-hidden="true">›</span> <a href="/answers/">Answers</a>
      </nav>
      <h1>{h1}</h1>
      <p class="ans-meta">Updated {updated_h} · {app}</p>
      {body}
      <aside class="ans-cta">
        <h2>Try it on your own town</h2>
        <p>Type any place on earth on the homepage and watch the feed fill in — then get the app for the parts the web cannot do.</p>
        <div class="ans-cta-row">
          <a class="btn-primary" href="/">Try the town demo</a>
          <a class="btn-secondary" href="{apple}" target="_blank" rel="noopener">App Store</a>
          <a class="btn-secondary" href="{play}" target="_blank" rel="noopener">Google Play</a>
        </div>
      </aside>
    </article>
  </main>

  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {year} {app} · <a href="/">Home</a> · <a href="/answers/">Answers</a> · <a href="/live/">Live</a> · <a href="/conflicts/">Conflicts</a> · <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{theme}
  <script src="/viewbar.js"></script>
  <script>
    if (window.InSnapsViewBar) window.InSnapsViewBar.mount({{
      label: 'Get InSnaps', sub: 'Your town and the world, in one feed'
    }});
  </script>
</body>
</html>
""".format(ga=GA_ID, title=e(title), app=APP_NAME, desc=e(desc), url=e(url), site=SITE_URL,
           ld=json.dumps(ld, ensure_ascii=False), nav=NAV, h1=html.escape(h1 or title, quote=False),
           updated_h=e(updated[:10]), body=body_html, apple=APP_STORE, play=PLAY_STORE,
           year=datetime.now(timezone.utc).year, theme=THEME_SCRIPT)


def index_html(pages, updated):
    e = lambda s: html.escape(str(s), quote=True)
    cards = "\n".join(
        '        <a class="ans-card" href="/answers/{slug}/">'
        '<h2>{title}</h2><p>{desc}</p>'
        '<span class="ans-card-q">Answers: “{target}”</span></a>'.format(
            slug=e(p["slug"]), title=html.escape(p.get("title") or p["slug"], quote=False),
            desc=html.escape(p.get("description", ""), quote=False),
            target=html.escape(p.get("target", ""), quote=False))
        for p in pages)
    ld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "InSnaps Answers",
        "url": SITE_URL + "/answers/",
        "description": "Straight answers to the questions people ask about local and world news apps.",
        "hasPart": [{"@type": "Article", "headline": p.get("title") or p["slug"],
                     "url": "%s/answers/%s/" % (SITE_URL, p["slug"])} for p in pages],
    }
    return """<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <script async src="https://www.googletagmanager.com/gtag/js?id={ga}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}};gtag('js',new Date());gtag('config','{ga}');</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Answers | {app}</title>
  <meta name="description" content="Straight, sourced answers about local and world news apps — what covers your town, what to use instead of Inshorts or Ground News, and the honest trade-offs.">
  <meta name="robots" content="index, follow, max-snippet:-1">
  <link rel="canonical" href="{site}/answers/">
  <link rel="icon" type="image/png" href="/logo.png">
  <script type="application/ld+json">{ld}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/answers.css">
  <link rel="stylesheet" href="/city.css">
  <script defer src="/city.js"></script>
</head>
<body>
{nav}
  <main class="ans-page">
    <div class="ans-index">
      <h1>Answers</h1>
      <p class="ans-index-lede">Straight answers to the questions people actually ask — with sources, comparisons, and the honest limitations. {n} pages, updated {updated_h}.</p>
      <div class="ans-grid">
{cards}
      </div>
    </div>
  </main>
  <footer class="ans-footer">
    <div class="ans-footer-inner">
      <p>&copy; {year} {app} · <a href="/">Home</a> · <a href="/live/">Live</a> · <a href="/conflicts/">Conflicts</a> · <a href="/privacy/">Privacy</a></p>
    </div>
  </footer>
{theme}
</body>
</html>
""".format(ga=GA_ID, app=APP_NAME, site=SITE_URL, ld=json.dumps(ld, ensure_ascii=False),
           nav=NAV, n=len(pages), updated_h=e(updated[:10]), cards=cards,
           year=datetime.now(timezone.utc).year, theme=THEME_SCRIPT)


# ───────────────────────── main ─────────────────────────

def sync_from_buzz():
    """Vendor answer-*.md out of buzz so CI can build without that repo."""
    src = os.path.abspath(BUZZ_DIR)
    if not os.path.isdir(src):
        print("  buzz not found at %s — rendering vendored copies only" % src)
        return 0
    os.makedirs(VENDOR_DIR, exist_ok=True)
    n = 0
    for name in sorted(os.listdir(src)):
        if not (name.startswith("answer-") and name.endswith(".md")):
            continue
        s, d = os.path.join(src, name), os.path.join(VENDOR_DIR, name)
        if not os.path.exists(d) or open(s).read() != open(d).read():
            shutil.copyfile(s, d)
            n += 1
    print("  synced %d file(s) from buzz" % n)
    return n


def main():
    updated = datetime.now(timezone.utc).isoformat()
    sync_from_buzz()

    if not os.path.isdir(VENDOR_DIR):
        print("  no _content/answers — nothing to render")
        return 0

    files = sorted(f for f in os.listdir(VENDOR_DIR) if f.endswith(".md"))
    if not files:
        print("  no answer markdown — nothing to render")
        return 0

    pages = []
    for name in files:
        raw = open(os.path.join(VENDOR_DIR, name), encoding="utf-8").read()
        meta, body_md = parse_frontmatter(raw)
        body_html, faqs, h1 = render_markdown(body_md)
        slug = meta.get("slug") or slugify(h1 or name[:-3].replace("answer-", ""))
        meta["slug"] = slug
        if not meta.get("title"):
            meta["title"] = h1 or slug.replace("-", " ").title()
        out_dir = os.path.join(OUT_DIR, slug)
        os.makedirs(out_dir, exist_ok=True)
        with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(page_html(meta, body_html, faqs, h1, updated))
        pages.append(meta)
        print("  + /answers/%s/  (%d FAQ%s)" % (slug, len(faqs), "" if len(faqs) == 1 else "s"))

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html(pages, updated))
    print("  + /answers/ index (%d pages)" % len(pages))

    # Hand the slugs to build.sh so they land in the sitemap.
    with open(os.path.join(ROOT, "_data", "answers.json"), "w", encoding="utf-8") as f:
        json.dump({"generatedAt": updated,
                   "pages": [{"slug": p["slug"], "title": p["title"],
                              "target": p.get("target", "")} for p in pages]}, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
