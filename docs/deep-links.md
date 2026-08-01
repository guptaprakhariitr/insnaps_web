# InSnaps Deep Links

Two kinds of shared links, both handled by static pages on GitHub Pages:

| Kind | Clean URL | Query URL | Page | Identifier |
|---|---|---|---|---|
| Article | `/a/<token>` | `/a/?t=<token>` | `a/index.html` | opaque token |
| Topic | `/t/<slug>` | `/t/?topic=<slug>` | `t/index.html` | readable slug |
| CelebMonitor article | `/celebmonitor/a/<token>` | `/celebmonitor/a/?t=<token>` | `celebmonitor/a/index.html` | opaque token |

The old domain `https://www.credibletechnologies.in/a/<token>` also continues to work.

Both redirect pages share their styling via `/redirect-page.css`.

## Flow

1. User taps a shared link → `insnaps.app/a/<token>` or `insnaps.app/t/<slug>`
2. GitHub Pages has no such file, so `404.html` runs and rewrites to the query form
   (`/a/?t=…` or `/t/?topic=…`)
3. The redirect page resolves the identifier and branches on device:
   - **Android** (phone + tablet): `intent://topic/<slug>#Intent;scheme=insnaps;package=com.prakshaappthree.appthree;end`.
     On the button click, `S.browser_fallback_url` sends Chrome to the Play Store when the app is absent.
   - **iOS / iPadOS**: custom scheme (`insnaps://topic/<slug>` for topics, `worldconflicts://article/<token>` for articles); if nothing handles it, falls through to the App Store after 1.5s.
   - **Mac**: same custom scheme as iOS. iPadOS 17+ reports a `Macintosh` UA, so it is
     separated from real Macs via `navigator.maxTouchPoints > 1`.
   - **Windows / Linux / anything else**: no deep-link attempt at all — the page shows
     store buttons plus a web fallback link.

The auto-attempt fires **once per session per identifier** (`sessionStorage`), so
navigating back doesn't re-trap the user in an app switch.

### App-installed detection

There is no reliable synchronous "is it installed?" API. Both pages use the standard
heuristic: fire the scheme, then start a 3s timer. If the app takes over, the page is
backgrounded and `visibilitychange` cancels the timer (`*_app_opened`). If the timer
fires, the app is absent or the scheme is unregistered (`*_app_not_opened`). Either way
the store buttons and web fallback are already rendered, so no state is unreachable.

## Schemes in use

| Link | Scheme + route |
|---|---|
| Article | `worldconflicts://article/<token>` |
| Topic | `insnaps://topic/<slug>` |
| CelebMonitor article | `insnaps://celebmonitor/a/<token>` |

Note the article page uses a different scheme (`worldconflicts`) from topics
(`insnaps`) — that is intentional and matches the existing app registrations.
The unused `deepLink` field in `_data/conflicts.json` still says
`insnaps://conflict/<slug>`; nothing emits it, and topics use `insnaps://topic/`.

## Topic deep links

Topic slugs are plain text, not encrypted, so links stay readable and shareable
(`/t/geopolitics`, `/t/ukraine-russia`).

- **Slug normalization** (`t/index.html`): lowercased, **accents folded to ASCII**,
  spaces/underscores → hyphens, everything outside `[a-z0-9-]` dropped, collapsed
  hyphens, capped at 64 chars. Values are written with `textContent`, never
  `innerHTML`.

  The fold step matters: without it the `[a-z0-9-]` strip *deletes* accented
  letters instead of folding them, so `Tromsø` became `troms`, `Zürich` became
  `zrich`, and `Łódź` collapsed to `d`. Dart has no built-in NFD normalisation,
  so both sides carry an identical explicit 261-entry table (generated from
  Unicode decompositions plus the letters that have none — ø, æ, ß, đ, ð, þ, ł,
  ı, œ). It also covers Vietnamese, so `Đà Nẵng` → `da-nang`.

  Four copies exist on the website because the files load independently
  (`pulse.js`, `viewbar.js`, `t/index.html`, `live/index.html`) plus the app's
  `topicSlug()`. `_scripts/check_slug_parity.py` runs in `build.sh` and **fails
  the build** if any of them drift; it compares parsed tables, so Dart/JS
  formatting differences do not matter.

  **Backwards compatible.** Links shared by older builds (`/t/troms`, `/t/kln`)
  still resolve: the redirect page renders any slug and the app turns it back
  into a search query. They simply search the truncated word; newly shared links
  carry the correct one. Verified for both forms.
- **Display names**: `TOPIC_NAMES` maps known domains to labels; unknown slugs are
  title-cased, so a topic added app-side still renders sensibly without a site deploy.
- **Web fallback**: if the slug matches a conflict hub that exists on the site, the page
  links to `/conflicts/<slug>/`; otherwise to `/conflicts/`. The slug → title map lives
  between the `CONFLICT_TOPICS:start/end` markers in `t/index.html` and is regenerated
  from `_data/conflicts.json` by `build.sh` — don't hand-edit it.

### App-side requirement

The web side sends `insnaps://topic/<slug>` (and the matching Android intent
path `intent://topic/<slug>` with `scheme=insnaps`). **The app must register that route** and resolve the slug
to a topic feed. Until it does, the deep-link attempt no-ops and users land on the store
/ web fallback — degraded but not broken.

## Android App Links

`/.well-known/assetlinks.json` enables Android App Links verification for `insnaps.app`.

## Apple Universal Links

`/.well-known/apple-app-site-association` enables Universal Links for iOS. Paths are
`/a/*` and `/t/*` for the main app, `/celebmonitor/a/*` for CelebMonitor.

> Apple caches this file via its CDN. After changing `paths`, expect a delay before
> devices pick it up; reinstalling the app forces a refetch.
