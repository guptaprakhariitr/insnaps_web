# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## InSnaps is three repos, one product

Work on any one of these usually implies checking the other two. The app is the
product; the site and the content engine exist to serve it.

| Repo | Role |
|---|---|
| `~/projects/Active projects/appthree` | **The app.** Flutter, InSnaps lives on branches `three` / `three-2` (pubspec name `world_conflicts`). The primary product — everything else points at it. Has its own `CLAUDE.md` and `ARCHITECTURE.md`. |
| `~/projects/website_credible` (here) | **The website**, insnaps.app. Static, GitHub Pages. Marketing, the browser-readable `/live/` wall and Pulse, the conflict tracker, `/answers/`, `/blog/`, and the deep-link handlers the app shares links through. |
| `~/projects/buzz` | **The GEO/SEO content engine.** Where long-form copy is written and tracked (`content/insnaps/*.md`, registered in `content/insnaps/_status.json`). Markdown authored there is *vendored* into this repo and rendered here. |

buzz is **not** checked out in CI, so anything it authors must be committed into
`_content/` here before it can build. `BUZZ_CONTENT_DIR` overrides the source
location when running locally against a live buzz checkout.

## Commands

```bash
bash build.sh          # the only build. Regenerates every generated page.
python3 -m http.server 4173   # preview at http://127.0.0.1:4173
```

`build.sh` is order-dependent and the order has bitten twice. Generators that
consume another generator's output must run after it, and **`gen_sitemap.py` /
`gen_llms.py` run last** so they can list what everything else actually wrote.

## Deploying

Two remotes. The live site is **`insnaps`** (`insnaps_web`), branch `insnaps` —
not `origin`, not `master`. A CI bot commits generated pages on a schedule, so
pushes race: **rebase, never force-push.** When a generated file conflicts, take
your side and re-run `build.sh` so the tree matches a real build.

## Generated vs authored

Do not hand-edit anything a generator owns — the next build silently reverts it.

| Path | Owner |
|---|---|
| `conflicts/*/`, `conflicts/index.html` | `build.sh` (from `_data/conflicts.json`) |
| `blog/<category>/` (the 6 RSS roundups) | `_scripts/generate_blog.py` |
| `blog/<post>/`, `blog/index.html`, `blog/feed.xml`, `blog/assets/*.svg` | `_scripts/gen_blog_posts.py` (from `_content/blog/`) |
| `answers/` | `_scripts/gen_answers.py` (from `_content/answers/`) |
| `_data/live/` | `_scripts/gen_live_feed.py` |
| `sitemap.xml`, `llms.txt` | `_scripts/gen_sitemap.py`, `_scripts/gen_llms.py` |

## The slug contract (shared with the app)

A link the app shares has to be a link the site resolves, so the slug function is
duplicated in **five** places — `pulse.js`, `viewbar.js`, `t/index.html`,
`live/index.html`, and the app's `lib/screens/topics_screen.dart`. Each carries
an identical 261-entry accent-fold table (Dart has no `String.normalize`, so
folding is explicit; without it `Tromsø` slugs to `troms`).

`_scripts/check_slug_parity.py` runs inside `build.sh` and **fails the build** on
drift. It skips the app copy when appthree is not checked out. Change one copy,
change all five.

Deep links: `worldconflicts://article/<token>`, `insnaps://topic/<slug>`,
`insnaps://celebmonitor/a/<token>`. Clean URLs `/a/<token>` and `/t/<slug>` are
rewritten by `404.html` — GitHub Pages serves it with a 404 status, which is what
fires the router. Both are `noindex, follow` and stay out of the sitemap.

## Structured data

One publisher entity, `https://insnaps.app/#organization`, declared in each
page's `@graph` and referenced by `@id` everywhere else. Never inline a second
Organization — a crawler then resolves several unrelated publishers instead of
one.

## Copy rules

These are product decisions, not style preferences. They apply to every
reader-facing surface: site copy, buzz posts, JSON-LD, llms.txt.

- **32 topic domains.** Not 41+.
- **No store ratings or review counts.** There are none to cite.
- **11 interface languages, English-only news content** — always stated together.
- Positioning: *global apps miss the local level, apps that track around you miss
  the world picture; InSnaps carries both.* Coverage reaches small towns, not
  just metros.
- State the **outcome** of that coverage reach, never the mechanism behind it.
- Honest limits stay in: early-stage indie app, first-party claims with no
  independent audit, no bias comparison (Ground News is better at that).

## Gotchas

- Google News `headlines/section/geo/<place>` returns **zero** items for small
  towns; `search?q=<place>` returns full results. Use search queries — small-town
  coverage is the whole point. (The app still uses geo sections in
  `trending_topics_service.dart`, so its local tier is empty for exactly the
  users it is differentiated for. Unfixed.)
- `api.rss2json.com` strips the `ht:` namespace from Google Trends RSS. Rich
  trends data must be parsed server-side, at build time.
- `<img src>` should be root-relative. Absolute `https://insnaps.app/...` in a
  local preview silently loads from *production*, so a missing new asset looks
  fine locally and 404s after deploy.
- Grid columns need `minmax(min(Npx, 100%), 1fr)`. Plain `minmax(Npx, 1fr)`
  overflows narrow phones, and `overflow: hidden` hides the evidence.
- White on `#FF6B35` is 2.84:1 and fails AA. Light theme uses `#C8481A`; orange
  fills carry dark text.
