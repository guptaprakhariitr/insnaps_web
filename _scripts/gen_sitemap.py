#!/usr/bin/env python3
"""Build sitemap.xml — the single authority, run last in build.sh.

This used to be an inline block in build.sh plus an append-hack in
generate_blog.py, which meant the sitemap was written *before* the pages it was
supposed to list. The long-form posts in /blog/<slug>/ were simply missing.
Now one script runs after every generator and reads what they actually wrote.

lastmod is per-URL and real where we know it (a post's dateModified, a
conflict's updated stamp). Faking a fresh lastmod on 50 URLs every night trains
crawlers to ignore the field.
"""
import json
import os
import sys
from datetime import datetime, timezone
from xml.sax.saxutils import escape

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE_URL = "https://insnaps.app"

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")

# Deep-link handlers (/t/, /a/) are noindex by design and stay out.
STATIC = [
    ("/", "1.0", "daily"),
    ("/live/", "0.9", "hourly"),
    ("/conflicts/", "0.9", "weekly"),
    ("/answers/", "0.85", "weekly"),
    ("/blog/", "0.8", "daily"),
    ("/news/", "0.85", "daily"),
    ("/support/", "0.75", "monthly"),
    ("/products/", "0.6", "weekly"),
    ("/privacy/", "0.4", "yearly"),
    # CelebMonitor is a separate app but its legal pages live on this domain;
    # Google finds them regardless, so list them rather than leave them orphaned.
    ("/celebmonitor/privacy/", "0.3", "yearly"),
    ("/celebmonitor/termsofuse/", "0.3", "yearly"),
]


def load(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def iso_day(value):
    """Normalise whatever a generator stamped into a sitemap-legal date."""
    if not value:
        return None
    v = str(value).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(v.replace("+00:00", "+0000"), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return v[:10] if len(v) >= 10 and v[4] == "-" else None


def main():
    urls = []
    seen = set()

    def add(path, priority, freq, lastmod=None):
        loc = SITE_URL + path
        if loc in seen:
            return
        seen.add(loc)
        urls.append((loc, priority, freq, lastmod or NOW))

    for path, pri, freq in STATIC:
        # Only list a page that is actually on disk.
        rel = "index.html" if path == "/" else path.strip("/") + "/index.html"
        if os.path.isfile(os.path.join(ROOT, rel)):
            add(path, pri, freq)
        else:
            print(f"  ! {path} not built — left out of the sitemap", file=sys.stderr)

    conflicts = load("_data/conflicts.json") or []
    for c in conflicts:
        add(f"/conflicts/{c['slug']}/", "0.7", "weekly", iso_day(c.get("updated")))

    answers = (load("_data/answers.json") or {}).get("pages") or []
    for a in answers:
        add(f"/answers/{a['slug']}/", "0.8", "monthly", iso_day(a.get("updated")))

    # Long-form posts rank higher than the machine-built RSS roundups: they are
    # the pages written to be worth landing on.
    posts = (load("_data/blog-posts.json") or {}).get("posts") or []
    post_slugs = set()
    for p in posts:
        post_slugs.add(p["slug"])
        add(f"/blog/{p['slug']}/", "0.8", "monthly",
            iso_day(p.get("published_iso") or p.get("published")))

    # Original reporting. Ranked with /answers/ rather than the roundups: these
    # are the pages written to be landed on from a search for the subject.
    stories = (load("_data/news.json") or {}).get("stories") or []
    for st in stories:
        add(f"/news/{st['slug']}/", "0.8", "monthly", iso_day(st.get("published_iso")))

    # Roundups: discovered from disk so this does not need generate_blog.py's
    # internals, and so a removed category drops out on the next build.
    blog_dir = os.path.join(ROOT, "blog")
    if os.path.isdir(blog_dir):
        for name in sorted(os.listdir(blog_dir)):
            if name in post_slugs or name.startswith((".", "_")):
                continue
            if os.path.isfile(os.path.join(blog_dir, name, "index.html")):
                add(f"/blog/{name}/", "0.6", "daily")

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, pri, freq, lastmod in urls:
        out += ["  <url>",
                f"    <loc>{escape(loc)}</loc>",
                f"    <lastmod>{lastmod}</lastmod>",
                f"    <changefreq>{freq}</changefreq>",
                f"    <priority>{pri}</priority>",
                "  </url>"]
    out.append("</urlset>")

    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")

    print(f"  sitemap.xml: {len(urls)} URLs "
          f"({len(conflicts)} conflicts, {len(answers)} answers, {len(posts)} posts, "
          f"{len(stories)} news)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
