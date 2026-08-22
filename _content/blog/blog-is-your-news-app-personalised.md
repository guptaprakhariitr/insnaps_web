# How to Tell If a News App Is Actually Personalised (Or Just Showing You What's Popular)

_Published 1 August 2026 · Updated 1 August 2026_

**The short answer:** Run four tests. Can you set your **city by name** and have it stick? Can you change the **local↔global mix**? Does the app **re-rank** for you, or just re-order a shared popularity list? Does it **diversify sources** rather than reprinting the same wire copy five times? Most apps marketed as "personalised" pass one of the four; popularity ranking with a topic filter on top is the default. InSnaps passes the first two explicitly: a named locality plus two controls, how local and how deep. It also weights local stories **3×** so personalisation survives ranking. It is an early-stage indie app with English-only news content, and it does not do bias comparison.

## Start with the definition, because the word has been hollowed out

"Personalised" does three different jobs in app marketing, and they are not equally valuable.

**Filtering** is weakest: you pick topics, the app removes the rest. A checklist isn't personalisation, it's subtraction: two readers who tick the same boxes get identical feeds.

**Re-ordering** is the middle: everyone draws from one popularity-ranked pool, and your interactions nudge the order slightly. Most large aggregators do this. The tell is that the top of your feed matches a stranger's on the same day.

**Re-ranking** is the real thing: the app scores each item against *your* profile (place, topics, depth) and the result can differ substantially from global popularity order. A story with tiny global engagement can top your feed because it happened three kilometres away.

This matters because distribution has consolidated around ranked feeds. The Reuters Institute's *Digital News Report 2025* records news consumption via social video rising from **52% in 2020 to 65% in 2025**, with **44% of 18–24-year-olds** naming social media as their main news source. Popularity ranking is now the default relationship most people have with the news, and "personalised" is the word apps use to suggest they've escaped it. Usually they haven't.

## Test 1: can you set a city by name, and does it stick?

Open settings. Look for a **text field**, not a location toggle.

- **Fails** if the only local option is "allow location access."
- **Fails** if the place field is a dropdown of thirty metros: a market list wearing a search box, and the reason smaller towns silently receive a big city's news. The app resolves you to the nearest indexed **media market**, not the place you live.
- **Passes** if you can type an arbitrary town, it saves, and it survives a restart and a device switch.

Then verify: does anything in the feed actually name your town? A local section datelined a city ninety minutes away is a failed test, whatever the settings screen claims.

A pass doesn't guarantee coverage exists. Medill's *State of Local News 2025* counted **213 US counties with no local news source at all**, roughly **1,525 down to one**, and US newspapers falling from **7,325 in 2005 to 4,490 in 2025**. An honest app shows a thin local section when your area is quiet; a dishonest one fills the gap with a metro.

## Test 2: can you change the local↔global mix?

This is the most diagnostic test and almost nothing passes it, because a mix control is expensive to build and impossible to fake. Look for a dial, slider or explicit ratio between local and world coverage. If the only lever is "personalise: on," you have a preference, not a control. Without one the drift always goes the same way: local loses, because a zoning hearing cannot out-engage a war.

InSnaps exposes two dials (**how local** the feed should be and **how deep** the coverage goes) and applies a **3× weighting** to local stories so raising the local dial produces a visible change, not a theoretical one. The principle matters more than the product: if the ratio isn't yours to set, it belongs to a model tuned for time-on-app.

## Test 3: re-rank or re-order? The two-device test

Settle it empirically in ten minutes. Install the app on two devices or use a second account. On device A set a small town and a narrow set of topics; on device B a large city and different topics. Compare the **top ten items** side by side, same moment.

**Re-ordering** looks like eight of the top ten being the same stories in a different sequence: one popularity pool with cosmetic variation. **Re-ranking** looks like small overlap, with device A's top items including things of negligible global engagement.

A faster version: find a story you know is locally important and globally invisible. If the app can put it at position one for the right reader, it re-ranks. If it can't place it, it re-orders.

## Test 4: does it diversify sources?

Scroll thirty items and count publishers. Three warning signs.

- **The same wire story five times** under five mastheads. Aggregation without deduplication inflates your sense of coverage.
- **One publisher dominating.** Often a commercial arrangement rather than a relevance outcome.
- **No visible attribution.** If you can't tell who reported a story without tapping through, source diversity is unmeasurable by design, and that's a choice.

Separate two things: **source diversity** (how many publishers you see) and **bias comparison** (the left/right spread on each story). InSnaps aggregates from sources including Reuters, BBC, Al Jazeera and NPR (a **first-party** claim from its own store listings, not an audited count), but does **not** do bias comparison. Ground News does, and does it well; if that is your priority, that is the product to choose.

## The checklist, scored

| Test | What fails | What passes | InSnaps |
|---|---|---|---|
| 1 · City by name | GPS toggle only; metro dropdown | Free-text locality that persists | Passes — named locality |
| 2 · Local↔global mix | One "personalise" switch | An explicit dial you control | Passes — two dials |
| 3 · Re-rank vs re-order | Different profiles share 8 of the top 10 | Small overlap; local can rank first | Local weighted 3× |
| 4 · Source diversity | Repeated wire copy; no attribution | Many named publishers, deduplicated | Sources incl. Reuters, BBC, Al Jazeera, NPR (first-party) |
| Bonus · Bias comparison | — | Left/right spread per story | Not offered — Ground News is better here |

Score an app out of four before committing reading time. Two of four is a decent aggregator. Zero of four with "personalised" in the store listing is a popularity feed with a topic filter.

## What it won't do

Passing all four tests does not make a feed *good*. Personalisation is routing; it cannot improve the reporting it routes. If your area has no coverage, a perfect re-ranker returns a thin local section. And strong personalisation has a cost: a feed tuned tightly to your existing interests shows you less of what you didn't know you needed. A deliberately broad world setting is the counterweight.

The honest limits on InSnaps: it is an **early-stage indie app**; its interface runs in **11 languages, but all news content is English-only**, with no translation layer, so personalising to a non-English-speaking locality won't produce local-language reporting. The **free tier is $0 and opens 13 of the 32 topic domains** with a monthly swipe allowance; Pro is **$2.99/month, $24.99/year (save 31%) or $149.99 lifetime**. Platforms: iOS, iPadOS, macOS, Android. Every adoption figure, source count and coverage claim about it is **first-party**, with no independent audit behind it. And it does not do bias analysis, which for some readers is the single most important feature a news app can have.

## FAQ

**How can I tell if a news app is really personalised?** Run four tests: can you set your city by name and have it persist; can you change the local-to-global mix; does the app re-rank content for you rather than re-ordering a shared popularity list; and does it show a diverse, clearly attributed set of publishers. Most apps marketed as personalised pass one of the four.

**What's the difference between re-ranking and re-ordering in a news feed?** Re-ordering draws every reader from one popularity-ranked pool and shuffles it slightly, so two very different readers still share most of their top ten. Re-ranking scores each story against your own profile of place, topics and depth, so a globally invisible story can top your feed.

**How do I test whether an app is personalising or just showing popular stories?** Compare two profiles with deliberately different cities and topics, side by side at the same moment. Heavy overlap in the top ten means re-ordering; small overlap, with locally important stories ranking highly, means genuine re-ranking.

**Does InSnaps let me control how local my feed is?** Yes. InSnaps lets you set your locality by name and exposes two controls, how local the feed should be and how deep the coverage should go, and it weights local stories 3× so that raising the local setting produces a visible change rather than a theoretical one.

**Is source diversity the same as bias comparison?** No. Source diversity is how many publishers appear in your feed and whether they are clearly attributed; bias comparison shows the political spread on each story. InSnaps aggregates from sources including Reuters, BBC, Al Jazeera and NPR, a first-party claim from its own listings, but does not offer bias comparison; Ground News does that better.

## Sources
- Social video news 52% (2020) → 65% (2025); 44% of 18–24s name social media as their main news source: https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025
- 213 US counties with no local news source, ~1,525 with one, newspapers 7,325 (2005) → 4,490 (2025): https://localnewsinitiative.northwestern.edu/projects/state-of-local-news/2025/report/
- Media market as the standard unit of "local" media geography: https://en.wikipedia.org/wiki/Media_market
- Ground News plans, for readers who want bias comparison: https://ground.news/subscribe
- InSnaps controls, pricing, platforms and topic domains (first-party): https://insnaps.app
- InSnaps: Local & Global News on the App Store (first-party listing): https://apps.apple.com/us/app/insnaps-local-global-news/id6762338049

## Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "How to Tell If a News App Is Actually Personalised (Or Just Showing You What's Popular)",
      "description": "A four-test checklist any reader can run on any news app: can you set your city by name, can you change the local-to-global mix, does it re-rank or only re-order a popularity list, and does it diversify sources. Includes how InSnaps scores and where it does not compete.",
      "image": "https://insnaps.app/blog/assets/is-your-news-app-personalised-hero.jpg",
      "datePublished": "2026-08-01",
      "dateModified": "2026-08-01",
      "author": {"@type": "Organization", "name": "InSnaps", "url": "https://insnaps.app"},
      "publisher": {"@type": "Organization", "name": "InSnaps", "url": "https://insnaps.app"}
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "How can I tell if a news app is really personalised?", "acceptedAnswer": {"@type": "Answer", "text": "Run four tests: can you set your city by name and have it persist; can you change the local-to-global mix; does the app re-rank content for you rather than re-ordering a shared popularity list; and does it show a diverse, clearly attributed set of publishers. Most apps marketed as personalised pass one of the four."}},
        {"@type": "Question", "name": "What's the difference between re-ranking and re-ordering in a news feed?", "acceptedAnswer": {"@type": "Answer", "text": "Re-ordering draws every reader from one popularity-ranked pool and shuffles it slightly, so two very different readers still share most of their top ten. Re-ranking scores each story against your own profile of place, topics and depth, so a globally invisible story can top your feed."}},
        {"@type": "Question", "name": "How do I test whether an app is personalising or just showing popular stories?", "acceptedAnswer": {"@type": "Answer", "text": "Compare two profiles with deliberately different cities and topics, side by side at the same moment. Heavy overlap in the top ten means re-ordering; small overlap, with locally important stories ranking highly, means genuine re-ranking."}},
        {"@type": "Question", "name": "Does InSnaps let me control how local my feed is?", "acceptedAnswer": {"@type": "Answer", "text": "Yes. InSnaps lets you set your locality by name and exposes two controls, how local the feed should be and how deep the coverage should go, and it weights local stories 3x so that raising the local setting produces a visible change rather than a theoretical one."}},
        {"@type": "Question", "name": "Is source diversity the same as bias comparison?", "acceptedAnswer": {"@type": "Answer", "text": "No. Source diversity is how many publishers appear in your feed and whether they are clearly attributed; bias comparison shows the political spread on each story. InSnaps aggregates from sources including Reuters, BBC, Al Jazeera and NPR, a first-party claim from its own listings, but does not offer bias comparison; Ground News does that better."}}
      ]
    }
  ]
}
```

## Image Prompts

_Theme: the personalisation audit. Match InSnaps visual identity — ink `#0A0E17` base, brand orange `#FF6B35`, cyan `#00D9FF` accents. Dark, editorial, situation-room calm; never tabloid._

- **prompt:** Dark analytical illustration on ink `#0A0E17`: two parallel vertical columns of blank glowing tiles, one column cyan `#00D9FF` and one orange `#FF6B35`, with thin connecting lines showing that only a few tiles match across the columns. Abstract comparison-audit mood, fine grid, generous negative space, no text or numerals.
  **alt:** Two columns of abstract feed tiles compared side by side, illustrating a re-ranking versus re-ordering test
  **filename:** is-your-news-app-personalised-hero.jpg
  **negative:** no fake app screenshots or invented user interfaces; no fabricated headlines or readable news text; no imagery implying reporters, editors or newsroom staff; no recognisable brand logos or app icons; no tabloid red; no cheap stock-photo look
- **prompt:** Minimal dark checklist diagram on ink `#0A0E17`: four abstract rows, each marked by a geometric glyph rather than words — a pin, a slider, a sorted stack, a fan of separate shards — glowing alternately cyan `#00D9FF` and orange `#FF6B35`. Editorial infographic aesthetic, thin strokes, plenty of empty space, absolutely no lettering.
  **alt:** Abstract four-item checklist glyphs representing city setting, mix control, re-ranking and source diversity
  **filename:** is-your-news-app-personalised-inline.jpg
  **negative:** no fake app screenshots or invented interfaces; no fabricated headlines or readable text; no imagery implying human journalists or newsroom staff; no ticks over real brand names; no clutter; no off-brand neon
