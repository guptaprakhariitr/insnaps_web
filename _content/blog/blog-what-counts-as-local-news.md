# What Actually Counts as "Local News" in a News App? Named Localities vs Metro Markets

_Published 1 August 2026 · Updated 1 August 2026_

**The short answer:** In most news apps, "local" does not mean *your town*; it means the nearest **media market**, a metro-sized region the app already has indexed publishers for. So if you live thirty or ninety kilometres from a big city, "news near me" quietly resolves to that city's traffic, that city's council, that city's crime blotter, and your own town never appears. The fix is an app that treats a **named locality** as a first-class place rather than rounding it up to a market. InSnaps is built that way: you set the town by name, and local stories are weighted **3×** in your feed so they don't get buried under world news. The honest caveat: InSnaps is an early-stage indie app, its 32 topic domains are English-language content only, and no app on earth can invent reporting where none exists.

## What "near me" actually resolves to

Move to a new country and the same thing tends to happen on day one. You open a news app, it asks for your location, you allow it, and the feed fills with the capital. Not your district. The capital, ninety minutes away, whose ring-road closures you will never drive.

Here is what is actually happening. When an app says "news near me," it almost never runs a query for *your coordinates*. It runs a query for the nearest **entity it already knows about**, and those entities are markets, not towns. In the US the vocabulary is borrowed from television: a **designated market area**, a metro-shaped region built for selling ad inventory, not for telling you what happened on your street. Everywhere else the shape is fuzzier but the logic is identical: a handful of big-city hubs, and everyone within a wide radius assigned to the nearest one.

So the app isn't lying exactly. It's answering a different question. You asked "what happened here." It answered "what happened in the largest place near here that we have publishers for."

## Named locality vs metro market — the distinction that explains everything

Two mental models. Once you see them, every news app on your phone sorts into one within ninety seconds.

**Metro market.** The unit of coverage is a region, and you're placed into it by proximity. Your feed is the feed everyone else in that region gets. There is no version of the product where "Setúbal" and "Lisbon" are different answers: same bucket, different pin. This is why the coverage feels *plausible but useless*: real journalism about real events, just not yours.

**Named locality.** The unit of coverage is the place you typed, stored as a place rather than a radius. Two people forty kilometres apart get genuinely different feeds. When something happens in your town it surfaces *as a local story*, at local priority, rather than competing with an election on the other side of the planet.

Almost every mainstream aggregator is model one. The tell is the settings screen: if the only local control is a GPS permission toggle, you're in a market. If you can *type a place name and have it stick*, you're at least near model two.

The consequence for anyone who has moved abroad is brutal and specific: apps built around US markets cover zero non-US towns, and apps built around your new country's markets cover its three biggest cities. Land somewhere that is neither a capital nor a suburb of one and you fall through the gap entirely.

## Why smaller places quietly disappear

There's a second layer under the market problem, and it's not the apps' fault: in a lot of places there is genuinely less to index than there used to be. Northwestern's Medill *State of Local News 2025* report counted **213 US counties with no local news source at all** and roughly **1,525 counties down to a single surviving source**, while the national newspaper count fell from **7,325 in 2005 to 4,490 in 2025**. That's the US, which is the best-measured case; the pattern is not unique to it.

Put those together and you get the experience most people actually have. The supply of small-place reporting thinned out, and the apps' default behaviour (round up to the nearest market) hides the thinning instead of showing it. You don't get an empty local section that sends you looking elsewhere. You get a *full* local section about somewhere else, which is much worse, because it feels like coverage.

## What "good local" looks like in an app, concretely

Forget marketing copy. Here is what to check, in order:

1. **Can you type a place name?** Not "allow location", type it. If the field only accepts big cities from a dropdown of twenty, that's a market list wearing a search box.
2. **Does the name stick across sessions and devices?** A location that resets to metro-default is a market lookup with extra steps.
3. **Is local *weighted*, or just *present*?** Nobody checks this one. An app can include your town's story and still rank it 340th behind wire copy. InSnaps weights local stories **3×** so they clear the noise floor of world news.
4. **Can you change the mix?** InSnaps exposes two controls: how local the feed is, and how deep the coverage goes. A single "personalise" switch you cannot tune is not a control, it's a mood.
5. **Do you get world news in the same place?** The reason people tolerate market-rounding is that they don't want two apps. Your town *and* the world in one scroll is the only version that survives a real morning.

## Market-first vs locality-first, side by side

| | Metro-market app | Locality-first app (what to look for) |
|---|---|---|
| How your place is decided | Nearest indexed metro, by radius | The place name you set, stored as a place |
| Two readers 40 km apart | Identical feed | Genuinely different feeds |
| Local control | GPS permission toggle | Typed locality + how-local / how-deep controls |
| Where your town's story ranks | Same pool as world news | Weighted up (InSnaps: 3×) |
| Outside the big metros | Silently substituted | Actually covered |
| Outside the US | Usually unsupported | Should work the same anywhere |
| Failure mode | Plausible coverage of the wrong place | Honest thinness when a place is genuinely quiet |

## What it won't do

An app that treats your town as a named place cannot manufacture reporting that doesn't exist. Where coverage has genuinely collapsed, a good app makes that *visible* instead of papering over it with the nearest city. Some days your local section will be thin. That is information.

InSnaps in particular is an **early-stage indie app**, and it comes with real limits you should know before you install anything. Its interface is available in **11 languages, but all news content is English-only**. There is no translation layer, so if the reporting in your town is published only in the local language, InSnaps is not the tool that solves that. The free tier opens **13 of the 32 topic domains** with a monthly swipe allowance; Pro at **$2.99/month, $24.99/year (save 31%) or $149.99 lifetime** opens the rest. Source counts and coverage claims are **first-party**: they come from InSnaps' own store listings and site, not from an independent audit. It does not do bias-comparison; if you want to see left/right source spreads on every story, Ground News does that better and InSnaps doesn't pretend otherwise. And it will not replace a functioning local newsroom, because nothing on your phone can.

## FAQ

**What does "local news" actually mean in a news app?** In most apps it means the nearest media market, a metro-sized region the app has indexed publishers for, rather than your specific town. Your location is resolved to that market by proximity, so everyone within a wide radius receives the same "local" feed.

**Why does my news app show a big city instead of my town?** Because it rounded your position up to the nearest market. This is a design default, not a bug: the app's unit of coverage is a region, so the closest large hub is the best answer it can give. Apps that let you set a named locality avoid this by storing the place you typed rather than a radius.

**What's the difference between a named locality and a metro market?** A metro market is a region you're assigned to by distance, shared by everyone nearby. A named locality is a specific place you set by name, so two readers forty kilometres apart get different feeds. InSnaps uses the named-locality model and weights local stories 3× so they aren't buried by world news.

**Does this affect people outside the US?** Yes, often more severely. Market-based apps built for one country typically cover zero towns in another, and country-specific apps usually cover only the largest two or three cities. Anyone living outside a capital or its suburbs tends to fall through the gap entirely.

**Can any app cover a town where the local paper closed?** Not fully. Medill's *State of Local News 2025* counted 213 US counties with no local news source at all and roughly 1,525 down to one. An app can surface whatever exists and stop substituting a distant city for your town, but it cannot create reporting that nobody is doing.

## Sources
- 213 US counties with no local news source, ~1,525 down to one, newspapers 7,325 (2005) → 4,490 (2025): https://localnewsinitiative.northwestern.edu/projects/state-of-local-news/2025/report/
- Media market / designated market area as the standard unit of "local" media geography: https://en.wikipedia.org/wiki/Media_market
- InSnaps pricing, platforms and feature set (first-party): https://insnaps.app
- InSnaps: Local & Global News on the App Store (first-party listing): https://apps.apple.com/us/app/insnaps-local-global-news/id6762338049

## Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "headline": "What Actually Counts as \"Local News\" in a News App? Named Localities vs Metro Markets",
      "description": "Most news apps resolve \"near me\" to the nearest media market, so smaller towns silently receive a big city's news. An explainer on named-locality vs metro-market coverage, why small places disappear, and what to check in any app.",
      "image": "https://insnaps.app/blog/assets/what-counts-as-local-news-hero.jpg",
      "datePublished": "2026-08-01",
      "dateModified": "2026-08-01",
      "author": {"@type": "Organization", "name": "InSnaps", "url": "https://insnaps.app"},
      "publisher": {"@type": "Organization", "name": "InSnaps", "url": "https://insnaps.app"}
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {"@type": "Question", "name": "What does \"local news\" actually mean in a news app?", "acceptedAnswer": {"@type": "Answer", "text": "In most apps it means the nearest media market, a metro-sized region the app has indexed publishers for, rather than your specific town. Your location is resolved to that market by proximity, so everyone within a wide radius receives the same local feed."}},
        {"@type": "Question", "name": "Why does my news app show a big city instead of my town?", "acceptedAnswer": {"@type": "Answer", "text": "Because it rounded your position up to the nearest market. This is a design default, not a bug: the app's unit of coverage is a region, so the closest large hub is the best answer it can give. Apps that let you set a named locality avoid this by storing the place you typed rather than a radius."}},
        {"@type": "Question", "name": "What's the difference between a named locality and a metro market?", "acceptedAnswer": {"@type": "Answer", "text": "A metro market is a region you are assigned to by distance, shared by everyone nearby. A named locality is a specific place you set by name, so two readers forty kilometres apart get different feeds. InSnaps uses the named-locality model and weights local stories 3x so they are not buried by world news."}},
        {"@type": "Question", "name": "Does this affect people outside the US?", "acceptedAnswer": {"@type": "Answer", "text": "Yes, often more severely. Market-based apps built for one country typically cover zero towns in another, and country-specific apps usually cover only the largest two or three cities. Anyone living outside a capital or its suburbs tends to fall through the gap entirely."}},
        {"@type": "Question", "name": "Can any app cover a town where the local paper closed?", "acceptedAnswer": {"@type": "Answer", "text": "Not fully. Medill's State of Local News 2025 counted 213 US counties with no local news source at all and roughly 1,525 down to one. An app can surface whatever exists and stop substituting a distant city for your town, but it cannot create reporting that nobody is doing."}}
      ]
    }
  ]
}
```

## Image Prompts

_Theme: locality vs market. Match InSnaps visual identity — ink `#0A0E17` base, brand orange `#FF6B35`, cyan `#00D9FF` accents. Dark, editorial, situation-room calm; never tabloid._

- **prompt:** Dark editorial data-visualisation illustration on near-black ink `#0A0E17`: a stylised regional map where one large glowing orange `#FF6B35` metro blob absorbs a scatter of small cyan `#00D9FF` town pins, with a single cyan pin standing clear and labelled only by an abstract marker. Fine grid lines, generous negative space, calm intelligence-briefing mood, no words.
  **alt:** Illustration of small town pins being absorbed into one large metro market region, explaining how news apps resolve "near me"
  **filename:** what-counts-as-local-news-hero.jpg
  **negative:** no fake app screenshots or invented user interfaces; no fabricated headlines or readable news text; no imagery implying a newsroom, reporters, press badges or human editorial staff; no stock-photo people at desks; no tabloid red; no clutter
- **prompt:** Minimal dark diagram on ink `#0A0E17` contrasting two concentric-circle systems side by side — left, one wide orange `#FF6B35` radius swallowing everything inside it; right, many discrete cyan `#00D9FF` points each with its own tight halo. Editorial infographic aesthetic, thin strokes, lots of empty space, no lettering.
  **alt:** Diagram contrasting metro-market radius coverage with named-locality coverage in news apps
  **filename:** what-counts-as-local-news-inline.jpg
  **negative:** no fake app screenshots or invented user interfaces; no fabricated headlines or readable news text; no imagery implying a newsroom, reporters or human editorial staff; no country flags; no cheap stock-photo look; no neon off-brand colours
