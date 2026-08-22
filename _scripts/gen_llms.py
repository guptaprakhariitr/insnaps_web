#!/usr/bin/env python3
"""Regenerate llms.txt from what the site actually contains.

llms.txt is the plain-text brief an answer engine reads instead of crawling 50
pages. Hand-maintaining it meant it drifted: it described /blog/ as "auto-updated
category news roundups" long after the written posts landed, and listed none of
the /answers/ pages. Generating it from _data/ keeps the brief and the site in
step.

Everything stated here has to be defensible: no store ratings (there are none),
32 topic domains, 11 interface languages but English-only articles.
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SITE_URL = "https://insnaps.app"

INTRO = """# InSnaps

> InSnaps is a personalized local + world news app for iPhone, iPad, Mac and \
Android. Global news apps cover the world but miss your street; local apps cover \
your street but miss the world. InSnaps carries both in one feed: set your city \
once and swipe through a mix of local, national and world news across 32 topic \
domains, in English, from sources including Reuters, BBC, Al Jazeera and NPR. \
Coverage is not limited to major metros — smaller towns and districts get a real \
local tier, not an empty one. Its signature extras are Pulse, a full-screen \
narrated reel format built for people who read news the way they watch short \
video, and an interactive map of active conflicts built on UCDP (Uppsala \
Conflict Data Program) data.

Taglines: "Your City. Your Country. Your World." and "Signal over noise."

## Key facts

- What it is: primarily a news reader. The app aggregates and organizes \
reporting from existing outlets and links out to the original article. Separately, \
the InSnaps team publishes a small amount of its own reporting at \
https://insnaps.app/news/ — original stories on companies, launches and events, \
each one citing its sources. Nothing in the app's feed is written by InSnaps.
- Pricing: free tier ($0 — personalized feed, conflict map, monthly swipe \
allowance). InSnaps Pro: $2.99/month, $24.99/year, or $149.99 lifetime — \
unlimited swipes, ad-free, cross-device sync, unlimited article audio.
- Platforms: iPhone, iPad, Mac (App Store), Android (Google Play).
- Location: you pick a city explicitly. There is no silent background location \
tracking, and the choice is changeable at any time.
- Topic domains: 32 user-selectable, including Geopolitics, Conflicts, Defense, \
Energy, World, Local, Business, Crypto, Tech, AI, Science, Health, Sports and \
Travel.
- Formats: swipe cards, Pulse (narrated full-screen reels), article audio, \
saved articles, share cards.
- Interface languages: English plus 10 more (Hindi, Spanish, French, German, \
Portuguese, Arabic, Hebrew, Chinese, Japanese, Russian). News articles \
themselves are in English.
- Conflict data sources: UCDP, ReliefWeb, Crisis Group, CFR.
"""

DOWNLOAD = """
## Download

- [App Store (iPhone, iPad, Mac)](https://apps.apple.com/us/app/insnaps-read-share-world-news/id6762338049)
- [Google Play (Android)](https://play.google.com/store/apps/details?id=com.prakshaappthree.appthree)
"""


def load(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def main():
    out = [INTRO]

    out.append("\n## Main pages\n")
    for path, label in [
        ("/", "what InSnaps is, features, pricing, FAQ"),
        ("/live/", "a live wall of current local + world headlines, readable in the browser"),
        ("/conflicts/", "index of active armed conflicts, with a detail page per conflict"),
        ("/answers/", "direct answers to common questions about news apps and coverage"),
        ("/blog/", "long-form writing on local news, coverage and news formats"),
        ("/news/", "original InSnaps reporting on companies, launches and events, with sources cited"),
        ("/support/", "help and contact"),
        ("/privacy/", "privacy policy"),
    ]:
        rel = "index.html" if path == "/" else path.strip("/") + "/index.html"
        if os.path.isfile(os.path.join(ROOT, rel)):
            out.append(f"- [{SITE_URL}{path}]({SITE_URL}{path}): {label}")

    posts = (load("_data/blog-posts.json") or {}).get("posts") or []
    if posts:
        out.append("\n## Articles\n")
        out.append("Written to answer the question in the title, whether or not "
                   "the reader ever installs anything.\n")
        for p in posts:
            desc = (p.get("description") or "").strip().replace("\n", " ")
            if len(desc) > 190:
                desc = desc[:187].rsplit(" ", 1)[0] + "…"
            out.append(f"- [{p.get('h1') or p['title']}]({SITE_URL}/blog/{p['slug']}/): {desc}")

    stories = (load("_data/news.json") or {}).get("stories") or []
    if stories:
        out.append("\n## Original reporting\n")
        out.append("Written by the InSnaps team, not aggregated. Each story names "
                   "its sources and says where a claim is a company's own.\n")
        for st in stories:
            desc = (st.get("description") or "").strip().replace("\n", " ")
            if len(desc) > 190:
                desc = desc[:187].rsplit(" ", 1)[0] + "…"
            subj = f" [about: {st['about_name']}]" if st.get("about_name") else ""
            out.append(f"- [{st['h1']}]({SITE_URL}/news/{st['slug']}/){subj}: {desc}")

    answers = (load("_data/answers.json") or {}).get("pages") or []
    if answers:
        out.append("\n## Answers\n")
        for a in answers:
            q = a.get("question") or a.get("title") or a["slug"]
            out.append(f"- [{q}]({SITE_URL}/answers/{a['slug']}/)")

    conflicts = load("_data/conflicts.json") or []
    if conflicts:
        names = ", ".join(c["title"] for c in conflicts[:12])
        out.append(f"\n## Conflict tracker\n")
        out.append(f"{len(conflicts)} conflicts tracked, each with its own page at "
                   f"{SITE_URL}/conflicts/<slug>/ — including {names}.")

    out.append(DOWNLOAD)
    out.append("\n## Feeds\n")
    out.append(f"- Sitemap: {SITE_URL}/sitemap.xml")
    out.append(f"- Article feed: {SITE_URL}/blog/feed.xml")
    out.append(f"- News feed: {SITE_URL}/news/feed.xml")

    text = "\n".join(out).rstrip() + "\n"
    with open(os.path.join(ROOT, "llms.txt"), "w", encoding="utf-8") as f:
        f.write(text)

    print(f"  llms.txt: {len(text)} bytes "
          f"({len(posts)} articles, {len(stories)} news, {len(answers)} answers, "
          f"{len(conflicts)} conflicts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
