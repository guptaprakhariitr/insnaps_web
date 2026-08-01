#!/usr/bin/env python3
"""Build the static live-news layer the site renders from.

Writes _data/live/*.json so the browser never calls a news API on page load
(a public page doing that gets throttled, and the richest fields are not
reachable from JS anyway — see NOTES).

Run from repo root:  python3 _scripts/gen_live_feed.py
Hooked into build.sh so every build refreshes the snapshot.

NOTES / why it is built this way
--------------------------------
* Google News **search** queries, never `headlines/section/geo/`. Geo sections
  return zero items for small towns (verified: Bhilwara, Jhunjhunu, Tromso,
  Nanded all 0) while search returns full results for the same places. Small
  localities are the whole point, so search it is.
* Google **Trends** RSS is parsed here, server-side, because it is the only
  source that carries images (`ht:picture`), search volume
  (`ht:approx_traffic`) and real article links. A browser cannot read them:
  the CORS proxy the site uses for client-side RSS strips the entire `ht:`
  namespace and rewrites `link` to point back at the feed.
* Google News search carries **no body text and no images**. So captions are
  headline-only and imagery falls back to the app's breaking templates, which
  is exactly what the app does for image-less articles.
* Towns are refreshed in a **rotating slice** per run rather than all at once,
  to keep request volume per build low. Untouched towns keep their previous
  cards, so the file only ever grows more complete.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "_data", "live")
UA = "InSnaps-LiveFeedBuilder/1.0 (+https://insnaps.app)"
TIMEOUT = 20
WORKERS = 6
TEMPLATE_COUNT = 44

HT = {"ht": "https://trends.google.com/trending/rss"}
# Google News emits <source> either namespaced or bare depending on the
# hl/gl combination, so both spellings have to be tried.
GN_SOURCE_TAGS = ("{http://news.google.com}source", "source")


def item_source(item):
    for tag in GN_SOURCE_TAGS:
        val = item.findtext(tag)
        if val and val.strip():
            return val.strip()
    return ""

# Trends + national tiers we pre-build. Keep this list short: one request each.
GEOS = [
    ("IN", "en-IN", "IN:en", "India"),
    ("US", "en-US", "US:en", "United States"),
    ("GB", "en-GB", "GB:en", "United Kingdom"),
    ("AU", "en-AU", "AU:en", "Australia"),
    ("CA", "en-CA", "CA:en", "Canada"),
    ("AE", "en-AE", "AE:en", "United Arab Emirates"),
    ("SG", "en-SG", "SG:en", "Singapore"),
    ("ZA", "en-ZA", "ZA:en", "South Africa"),
]

# World tier: broad global queries, deliberately not conflict-only.
WORLD_QUERIES = [
    "world news",
    "global economy",
    "climate",
    "technology",
    "science breakthrough",
    "geopolitics",
]

# Pre-baked towns. Deliberately weighted toward places a staffed newsroom
# would never cover, because that is the differentiator being demonstrated.
# Refreshed in a rotating slice (see TOWN_SLICE).
TOWNS = [
    # India — small and mid-tier
    ("Bhilwara", "IN"), ("Jhunjhunu", "IN"), ("Nanded", "IN"), ("Karimnagar", "IN"),
    ("Shivamogga", "IN"), ("Bilaspur", "IN"), ("Muzaffarpur", "IN"), ("Kakinada", "IN"),
    ("Sangli", "IN"), ("Rourkela", "IN"), ("Hisar", "IN"), ("Tirunelveli", "IN"),
    ("Jalgaon", "IN"), ("Ratlam", "IN"), ("Darbhanga", "IN"), ("Kollam", "IN"),
    ("Bathinda", "IN"), ("Alwar", "IN"), ("Satara", "IN"), ("Dhanbad", "IN"),
    ("Pune", "IN"), ("Lucknow", "IN"), ("Indore", "IN"), ("Kochi", "IN"),
    ("Jaipur", "IN"), ("Nagpur", "IN"), ("Surat", "IN"), ("Patna", "IN"),
    ("Bhubaneswar", "IN"), ("Coimbatore", "IN"), ("Mumbai", "IN"), ("Delhi", "IN"),
    ("Bengaluru", "IN"), ("Hyderabad", "IN"), ("Chennai", "IN"), ("Kolkata", "IN"),
    ("Ahmedabad", "IN"), ("Guwahati", "IN"), ("Dehradun", "IN"), ("Raipur", "IN"),
    # United States — small towns and mid markets
    ("Kearney Nebraska", "US"), ("Bozeman Montana", "US"), ("Dubuque Iowa", "US"),
    ("Amarillo Texas", "US"), ("Bend Oregon", "US"), ("Missoula Montana", "US"),
    ("Wichita Kansas", "US"), ("Roanoke Virginia", "US"), ("Duluth Minnesota", "US"),
    ("Fargo North Dakota", "US"), ("Boise Idaho", "US"), ("Chattanooga Tennessee", "US"),
    ("Lubbock Texas", "US"), ("Erie Pennsylvania", "US"), ("Spokane Washington", "US"),
    ("Fresno California", "US"), ("Toledo Ohio", "US"), ("Shreveport Louisiana", "US"),
    ("New York", "US"), ("Chicago", "US"), ("Houston", "US"), ("Seattle", "US"),
    ("Atlanta", "US"), ("Denver", "US"), ("Phoenix", "US"), ("Detroit", "US"),
    # United Kingdom
    ("Wigan", "GB"), ("Grimsby", "GB"), ("Dundee", "GB"), ("Swansea", "GB"),
    ("Carlisle", "GB"), ("Doncaster", "GB"), ("Ipswich", "GB"), ("Preston", "GB"),
    ("Londonderry", "GB"), ("Inverness", "GB"), ("London", "GB"), ("Manchester", "GB"),
    ("Birmingham", "GB"), ("Glasgow", "GB"), ("Leeds", "GB"), ("Bristol", "GB"),
    # Australia / New Zealand
    ("Wagga Wagga", "AU"), ("Toowoomba", "AU"), ("Bendigo", "AU"), ("Rockhampton", "AU"),
    ("Launceston", "AU"), ("Geraldton", "AU"), ("Dubbo", "AU"), ("Sydney", "AU"),
    ("Melbourne", "AU"), ("Perth", "AU"), ("Brisbane", "AU"), ("Auckland", "AU"),
    ("Christchurch", "AU"), ("Hamilton New Zealand", "AU"),
    # Canada
    ("Moose Jaw", "CA"), ("Thunder Bay", "CA"), ("Kamloops", "CA"), ("Sudbury", "CA"),
    ("Lethbridge", "CA"), ("Moncton", "CA"), ("Toronto", "CA"), ("Vancouver", "CA"),
    ("Calgary", "CA"), ("Montreal", "CA"), ("Ottawa", "CA"), ("Halifax", "CA"),
    # Europe
    ("Tromso", "GB"), ("Aarhus", "GB"), ("Bilbao", "GB"), ("Porto", "GB"),
    ("Gdansk", "GB"), ("Brno", "GB"), ("Cluj", "GB"), ("Thessaloniki", "GB"),
    ("Bologna", "GB"), ("Leipzig", "GB"), ("Utrecht", "GB"), ("Bergen", "GB"),
    ("Tampere", "GB"), ("Graz", "GB"), ("Lyon", "GB"), ("Valencia", "GB"),
    # Africa / Middle East
    ("Kumasi", "ZA"), ("Mombasa", "ZA"), ("Kisumu", "ZA"), ("Port Harcourt", "ZA"),
    ("Bulawayo", "ZA"), ("Tamale", "ZA"), ("Nakuru", "ZA"), ("Sfax", "ZA"),
    ("Lagos", "ZA"), ("Nairobi", "ZA"), ("Accra", "ZA"), ("Cape Town", "ZA"),
    ("Durban", "ZA"), ("Kampala", "ZA"), ("Dar es Salaam", "ZA"), ("Abuja", "ZA"),
    ("Sharjah", "AE"), ("Al Ain", "AE"), ("Dubai", "AE"), ("Abu Dhabi", "AE"),
    # Asia-Pacific
    ("Cebu", "SG"), ("Davao", "SG"), ("Surabaya", "SG"), ("Medan", "SG"),
    ("Chiang Mai", "SG"), ("Penang", "SG"), ("Da Nang", "SG"), ("Kuching", "SG"),
    ("Singapore", "SG"), ("Jakarta", "SG"), ("Manila", "SG"), ("Bangkok", "SG"),
    ("Kuala Lumpur", "SG"), ("Ho Chi Minh City", "SG"), ("Colombo", "SG"), ("Dhaka", "SG"),
]

# How many towns to refresh per run. The rest keep their previous cards.
TOWN_SLICE = 40

MAX_CARDS = 12          # per bucket
MAX_PULSE = 16          # hero pool; the page plays 4 at a time from this


# ─────────────────────────── helpers ───────────────────────────

# Latin letters only: ASCII, Latin-1 Supplement, Latin Extended-A/B.
# Deliberately excludes Devanagari, CJK, Arabic, Cyrillic, Thai and the rest.
_NON_LATIN_LETTER = re.compile(
    r"[^\W\d_]", re.UNICODE)
_LATIN_LETTER = re.compile(r"[A-Za-z\u00C0-\u024F]")


def is_english(text):
    """True only for headlines written entirely in Latin script.

    Google News honours hl/ceid for the *interface*, not the articles: an Indian
    query returns Hindi, Kannada and Marathi headlines mixed in with the English
    ones, often within a single title ("Car Accident में Tarun Nayak की मौत").
    No feed parameter filters by article language, so this does.

    Strict by design — a single non-Latin letter rejects the item. Accented
    Latin ("Tromsø", "São Paulo", "Zürich") still passes, since those are Latin
    script and appear in English copy.
    """
    if not text:
        return False
    letters = _NON_LATIN_LETTER.findall(text)
    if len(letters) < 6:
        return False
    for ch in letters:
        if not _LATIN_LETTER.match(ch):
            return False
    return True


def slugify(text):
    """Same normalization as t/index.html and the app's topicSlug()."""
    s = (text or "").strip().lower()
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s[:64].rstrip("-")


def utf16_units(s):
    """Iterate UTF-16 code units, not code points.

    Dart's String.codeUnits and JS's charCodeAt() are both UTF-16, so hashing
    Python's code points would silently diverge from the app and the browser on
    any non-BMP character (an emoji in a trend label is enough to do it).
    """
    data = s.encode("utf-16-le", "surrogatepass")
    for i in range(0, len(data), 2):
        yield data[i] | (data[i + 1] << 8)


def template_for(seed):
    """Deterministic breaking-template pick, matching the app's
    breakingTemplateAsset(): h = h*31 + c, masked to 31 bits."""
    h = 0
    for u in utf16_units(seed):
        h = (h * 31 + u) & 0x7FFFFFFF
    return "bt_%02d" % (h % TEMPLATE_COUNT + 1)


def card_id(url):
    """Short stable id (FNV-1a 32-bit), used as the visual seed on the client
    the same way the app seeds off article.id."""
    h = 0x811C9DC5
    for u in utf16_units(url):
        h ^= u
        h = (h * 0x01000193) & 0xFFFFFFFF
    return "%08x" % h


def clean_text(s):
    if not s:
        return ""
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("&nbsp;", " ").replace("&amp;", "&")
    s = s.replace("&#39;", "'").replace("&quot;", '"')
    s = s.replace("&lt;", "<").replace("&gt;", ">")
    return re.sub(r"\s+", " ", s).strip()


def strip_source_suffix(title, source):
    """Google News appends ' - Publisher' to titles; drop it so the caption
    reads like a headline instead of a feed row."""
    t = clean_text(title)
    if source and t.endswith(" - " + source):
        t = t[: -(len(source) + 3)].rstrip()
    else:
        t = re.sub(r"\s+-\s+[^-]{2,40}$", "", t)
    return t.strip()


def iso(pubdate):
    try:
        return parsedate_to_datetime(pubdate).astimezone(timezone.utc).isoformat()
    except Exception:
        return None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.read()
    except Exception as e:
        print(f"  ! {url[:78]} -> {e}", file=sys.stderr)
        return None


def parse_items(raw):
    if not raw:
        return []
    try:
        return ET.fromstring(raw).findall(".//item")
    except Exception as e:
        print(f"  ! xml parse: {e}", file=sys.stderr)
        return []


# ─────────────────────────── sources ───────────────────────────

def news_search(query, hl, gl, ceid, tier, place=None, limit=MAX_CARDS):
    """Google News search RSS → headline cards. Headline + source + link only:
    that is all the feed licenses, and it keeps reading in the app."""
    url = ("https://news.google.com/rss/search?q="
           + urllib.parse.quote(query)
           + f"&hl={hl}&gl={gl}&ceid={ceid}")
    out, seen = [], set()
    for it in parse_items(fetch(url)):
        link = (it.findtext("link") or "").strip()
        if not link:
            continue
        source = clean_text(item_source(it))
        title = strip_source_suffix(it.findtext("title") or "", source)
        if not title or len(title) < 12:
            continue
        if not is_english(title):
            continue
        key = title.lower()[:60]
        if key in seen:
            continue
        seen.add(key)
        out.append({
            "id": card_id(link),
            "title": title,
            "source": source or "Google News",
            "url": link,
            "publishedAt": iso(it.findtext("pubDate")),
            "image": None,
            "template": template_for(link),
            "tier": tier,
            "place": place,
        })
        if len(out) >= limit:
            break
    return out


def trends(gl, hl, ceid, limit=MAX_CARDS):
    """Google Trends RSS → the only source with images + search volume.
    Must be parsed here; the client-side CORS proxy strips the ht: namespace."""
    url = f"https://trends.google.com/trending/rss?geo={gl}"
    out = []
    for it in parse_items(fetch(url)):
        label = clean_text(it.findtext("title"))
        if not label or not is_english(label):
            continue
        pic = (it.findtext("ht:picture", default="", namespaces=HT) or "").strip()
        if pic.startswith("//"):
            pic = "https:" + pic
        traffic = clean_text(it.findtext("ht:approx_traffic", default="", namespaces=HT))
        heads = []
        for n in it.findall("ht:news_item", HT):
            ht_title = clean_text(n.findtext("ht:news_item_title", default="", namespaces=HT))
            ht_url = (n.findtext("ht:news_item_url", default="", namespaces=HT) or "").strip()
            ht_src = clean_text(n.findtext("ht:news_item_source", default="", namespaces=HT))
            if ht_title and ht_url and is_english(ht_title):
                heads.append({"title": ht_title, "url": ht_url, "source": ht_src})
        if not heads:
            continue            # no English article for this trend — skip it
        lead = heads[0]
        link = lead["url"] if lead else url
        out.append({
            "id": card_id(link + label),
            "title": (lead["title"] if lead else label),
            "topic": label,
            "slug": slugify(label),
            "traffic": traffic or None,
            "source": (lead["source"] if lead and lead["source"] else "Google Trends"),
            "url": link,
            "publishedAt": iso(it.findtext("pubDate")),
            "image": pic or None,
            "template": template_for(link + label),
            "tier": "trending",
            "headlines": heads[:3],
            "place": None,
        })
        if len(out) >= limit:
            break
    return out


# ─────────────────────────── assembly ───────────────────────────

def load_previous(name):
    path = os.path.join(OUT_DIR, name)
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def write_json(name, payload, previous_ok_key=None):
    """Write, but never replace a populated file with an empty one."""
    path = os.path.join(OUT_DIR, name)
    if previous_ok_key is not None and not payload.get(previous_ok_key):
        prev = load_previous(name)
        if prev and prev.get(previous_ok_key):
            print(f"  ! {name}: nothing fetched — keeping previous snapshot", file=sys.stderr)
            return False
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(path, "w") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    return True


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def build_trending():
    print("  trends…")
    result = {}
    with ThreadPoolExecutor(max_workers=min(WORKERS, len(GEOS))) as ex:
        futures = {ex.submit(trends, gl, hl, ceid): gl for gl, hl, ceid, _ in GEOS}
        for fut, gl in futures.items():
            try:
                items = fut.result()
            except Exception:
                items = []
            if items:
                result[gl] = items
    total = sum(len(v) for v in result.values())
    print(f"    {total} trends across {len(result)} geos")
    write_json("trending.json", {"generatedAt": now_iso(), "geos": result}, "geos")
    return result


def build_world():
    print("  world tier…")
    cards, seen = [], set()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futures = [ex.submit(news_search, q, "en-US", "US", "US:en", "world", None, 6)
                   for q in WORLD_QUERIES]
        for fut in futures:
            try:
                batch = fut.result()
            except Exception:
                batch = []
            for c in batch:
                k = c["title"].lower()[:60]
                if k not in seen:
                    seen.add(k)
                    cards.append(c)
    cards.sort(key=lambda c: c["publishedAt"] or "", reverse=True)
    cards = cards[:24]
    print(f"    {len(cards)} world cards")
    write_json("world.json", {"generatedAt": now_iso(), "cards": cards}, "cards")
    return cards


def build_countries():
    print("  national tiers…")
    result = {}

    def one(entry):
        gl, hl, ceid, name = entry
        return gl, news_search(f"{name} news", hl, gl, ceid, "national", None, MAX_CARDS)

    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for gl, cards in ex.map(one, GEOS):
            if cards:
                result[gl] = cards
    print(f"    {len(result)} countries")
    write_json("countries.json", {"generatedAt": now_iso(), "countries": result}, "countries")
    return result


def load_town(slug):
    path = os.path.join(OUT_DIR, "towns", f"{slug}.json")
    if not os.path.exists(path):
        return None
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return None


def sanitize_cached_towns():
    """Re-filter town files already on disk.

    Towns refresh in a rotating slice, so cards fetched before a filter change
    would otherwise survive for hours. Cheap and offline: no requests.
    """
    town_dir = os.path.join(OUT_DIR, "towns")
    if not os.path.isdir(town_dir):
        return 0
    dropped = 0
    for name in os.listdir(town_dir):
        if not name.endswith(".json"):
            continue
        path = os.path.join(town_dir, name)
        try:
            with open(path) as f:
                data = json.load(f)
        except Exception:
            continue
        cards = data.get("cards") or []
        keep = [c for c in cards if is_english(c.get("title", ""))]
        if len(keep) != len(cards):
            dropped += len(cards) - len(keep)
            data["cards"] = keep
            with open(path, "w") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    if dropped:
        print(f"    dropped {dropped} non-English card(s) from cached towns")
    return dropped


def build_towns():
    """Rotating slice so a single build never fires 150+ requests.

    Each town is written to its own small file (`towns/<slug>.json`) plus a tiny
    index, so the town search fetches ~2 KB rather than the whole corpus.
    """
    town_dir = os.path.join(OUT_DIR, "towns")
    os.makedirs(town_dir, exist_ok=True)
    prev = load_previous("towns-index.json") or {}
    index = dict(prev.get("towns") or {})
    cursor = int(prev.get("cursor") or 0)

    order = TOWNS
    slice_idx = [(cursor + i) % len(order) for i in range(min(TOWN_SLICE, len(order)))]
    batch = [order[i] for i in slice_idx]
    print(f"  towns… refreshing {len(batch)} of {len(order)} (cursor {cursor})")

    ceid_for = {gl: (hl, ceid) for gl, hl, ceid, _ in GEOS}

    def one(entry):
        place, cc = entry
        hl, ceid = ceid_for.get(cc, ("en-US", "US:en"))
        return place, cc, news_search(place, hl, cc, ceid, "local", place, 8)

    refreshed = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        for place, cc, cards in ex.map(one, batch):
            slug = slugify(place)
            if not cards:
                # Keep whatever we already had rather than blanking a town on a
                # single bad fetch. Only record an explicit miss if it is new,
                # so the UI can say "no coverage" instead of spinning.
                if slug in index:
                    continue
                payload = {"name": place, "cc": cc, "cards": [], "updatedAt": now_iso()}
            else:
                payload = {"name": place, "cc": cc, "cards": cards, "updatedAt": now_iso()}
                refreshed += 1
            with open(os.path.join(town_dir, f"{slug}.json"), "w") as f:
                json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
            index[slug] = {"name": place, "cc": cc, "n": len(cards)}

    # Any town never fetched yet still belongs in the index so search can
    # suggest it (the client falls back to a live lookup for empty entries).
    for place, cc in order:
        index.setdefault(slugify(place), {"name": place, "cc": cc, "n": 0})

    payload = {
        "generatedAt": now_iso(),
        "cursor": (cursor + len(batch)) % len(order),
        "count": len(index),
        "withCards": sum(1 for t in index.values() if t.get("n")),
        "towns": index,
    }
    print(f"    {refreshed} refreshed, {payload['withCards']}/{len(index)} with coverage")
    write_json("towns-index.json", payload, "towns")
    return index


def build_pulse(trending_by_geo, world_cards):
    """Hero deck.

    Trends are the only cards carrying real photography, but Google Trends
    skews to celebrity/sport, which undersells a news app on the hero. So
    interleave: photo-bearing trend, then a world headline, and so on. That
    keeps the visual pull while making every other card hard news.
    """
    photo = []
    for gl in ("US", "IN", "GB"):
        for c in (trending_by_geo.get(gl) or []):
            # Require a real lead article, not just a bare search phrase.
            if c.get("image") and c.get("headlines"):
                photo.append(c)
        if len(photo) >= MAX_PULSE:
            break
    # Highest search volume first: "500+" -> 500.
    def traffic_num(c):
        t = (c.get("traffic") or "").replace(",", "")
        m = re.search(r"(\d+)", t)
        return int(m.group(1)) if m else 0
    photo.sort(key=traffic_num, reverse=True)

    deck, seen = [], set()
    # World news leads: the branded breaking-news templates read better on a
    # news hero than a celebrity trend photo, and Trends skews entertainment.
    pools = [list(world_cards), photo]
    turn = 0
    while len(deck) < MAX_PULSE and (pools[0] or pools[1]):
        pool = pools[turn % 2] or pools[(turn + 1) % 2]
        turn += 1
        if not pool:
            break
        c = pool.pop(0)
        k = (c.get("title") or "").lower()[:60]
        if k in seen:
            continue
        seen.add(k)
        deck.append(c)

    print(f"    {len(deck)} pulse cards ({sum(1 for c in deck if c.get('image'))} with photos)")
    write_json("pulse.json", {"generatedAt": now_iso(), "cards": deck}, "cards")
    return deck


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("  building live news layer…")
    tr = build_trending()
    world = build_world()
    build_countries()
    build_towns()
    sanitize_cached_towns()
    build_pulse(tr, world)
    print("  live layer done")
    # Non-fatal by design: a build must still succeed on a bad network.
    return 0


if __name__ == "__main__":
    sys.exit(main())
